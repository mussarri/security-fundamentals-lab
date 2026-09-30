const http = require('http');
const https = require('https');
const net = require('net');
const dns = require('dns').promises;
const url = require('url');

// 1. IP DENETİM POLİTİKASI
const BLOCKED_IPV4_RANGES = [
  { start: '0.0.0.0', end: '0.255.255.255' },
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '255.255.255.255', end: '255.255.255.255' }
];

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isDisallowedIp(ipStr) {
  // IPv6 Değerlendirmesi
  if (ipStr.includes(':')) {
    const normalized = ipStr.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true; // Link-local
    if (normalized.startsWith('fc00:') || normalized.startsWith('fd00:')) return true; // ULA
    if (normalized.includes('::ffff:')) {
      const ipv4Part = normalized.split('::ffff:')[1];
      if (net.isIPv4(ipv4Part)) return isDisallowedIp(ipv4Part);
    }
    return true; // Dahili/yerel test haricindeki tüm rezerve IPv6'lar kısıtlanır
  }

  // IPv4 Değerlendirmesi
  if (!net.isIPv4(ipStr)) return true;
  const ipLong = ipToLong(ipStr);
  return BLOCKED_IPV4_RANGES.some(r => ipLong >= ipToLong(r.start) && ipLong <= ipToLong(r.end));
}

// 2. GELİŞMİŞ SSRF SAVUNMA BORU HATTI
async function hardenedFetch(targetUrl, maxRedirects = 3) {
  if (maxRedirects < 0) {
    throw new Error('SSRF Savunması: Maksimum yönlendirme limiti aşıldı.');
  }

  // 1. URL Çözümleme ve Şema Doğrulama
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new Error('SSRF Savunması: Geçersiz URL formatı.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF Savunması: Desteklenmeyen şema (${parsed.protocol}). Sadece http/https desteklenir.`);
  }

  // 2. DNS Çözümleme ve IP Doğrulama
  const hostname = parsed.hostname;
  let resolvedIps = [];

  if (net.isIP(hostname)) {
    resolvedIps = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      resolvedIps = records.map(r => r.address);
    } catch (e) {
      throw new Error(`SSRF Savunması: DNS çözümlenemedi (${hostname}).`);
    }
  }

  for (const ip of resolvedIps) {
    if (isDisallowedIp(ip)) {
      throw new Error(`SSRF Savunması: Erişilmek istenen IP kısıtlı ağ aralığında (${ip}).`);
    }
  }

  const targetIp = resolvedIps[0];
  const isHttps = parsed.protocol === 'https:';
  const defaultPort = isHttps ? 443 : 80;
  const targetPort = parsed.port ? parseInt(parsed.port, 10) : defaultPort;

  // 3. DNS Pinning Destekli İstek
  const clientModule = isHttps ? https : http;
  const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2 MB

  return new Promise((resolve, reject) => {
    const requestOptions = {
      host: targetIp, // Soket onaylanan IP'ye açılır (TOCTOU engeli)
      port: targetPort,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Host': hostname,
        'User-Agent': 'SecurityEngine-SSRF-Pipeline/3.0'
      },
      timeout: 3000,
      rejectUnauthorized: true,
      servername: isHttps ? hostname : undefined // TLS SNI doğrulaması
    };

    const req = clientModule.request(requestOptions, (res) => {
      // 4. Yönlendirme (Redirect) Denetimi
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const nextUrl = new URL(res.headers.location, targetUrl).href;
        req.destroy();
        return resolve(hardenedFetch(nextUrl, maxRedirects - 1));
      }

      let receivedBytes = 0;
      const chunks = [];

      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_RESPONSE_SIZE) {
          req.destroy();
          return reject(new Error('SSRF Savunması: Yanıt boyutu sınırı aşıldı (Max: 2MB).'));
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('SSRF Savunması: Bağlantı zaman aşımına uğradı.'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

// 3. LABORATUVAR HTTP SUNUCUSU
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // Dahili Hassas Servis (Yalnızca yerel ağ simülasyonu)
  if (parsedUrl.pathname === '/internal/metadata') {
    return sendJson(200, {
      iam_role: "vault-root-admin",
      internal_secret: "FLAG{SECURE_INTERNAL_METADATA_SECRET}"
    });
  }

  // Dahili Servise Yönlendiren Tuzak Uç Noktası
  if (parsedUrl.pathname === '/redirect-trap') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:4007/internal/metadata' });
    return res.end();
  }

  // Zafiyetli Fetch Uç Noktası
  if (parsedUrl.pathname === '/api/vulnerable/fetch') {
    const target = parsedUrl.query.url;
    if (!target) return sendJson(400, { error: "url parametresi eksik." });

    http.get(target, (proxyRes) => {
      let data = '';
      proxyRes.on('data', c => data += c);
      proxyRes.on('end', () => {
        sendJson(200, { status: "SUCCESS", data });
      });
    }).on('error', (err) => {
      sendJson(500, { error: err.message });
    });
    return;
  }

  // Sıkılaştırılmış Fetch Uç Noktası
  if (parsedUrl.pathname === '/api/hardened/fetch') {
    const target = parsedUrl.query.url;
    if (!target) return sendJson(400, { error: "url parametresi eksik." });

    try {
      const response = await hardenedFetch(target);
      return sendJson(200, { status: "SUCCESS", response });
    } catch (err) {
      return sendJson(403, { error: err.message });
    }
  }

  sendJson(404, { error: "Not Found" });
});

server.listen(4007, '127.0.0.1', () => {
  console.log('[+] SSRF v3 Lab Sunucusu 127.0.0.1:4007 üzerinde aktif.');
});
