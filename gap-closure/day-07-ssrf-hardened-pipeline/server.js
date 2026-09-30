const http = require("http");
const net = require("net");
const dns = require("dns").promises;
const url = require("url");

// 1. YASAKLI IP ARALIKLARI (IPv4 + IPv6 + Cloud Metadata)
// Bu aralıklar, dahili ağlara ve bulut metadata servislerine erişimi engellemek için kullanılır
const BLOCKED_IPV4_RANGES = [
  { start: "127.0.0.0", end: "127.255.255.255" }, // Loopback
  { start: "10.0.0.0", end: "10.255.255.255" }, // RFC 1918 Private
  { start: "172.16.0.0", end: "172.31.255.255" }, // RFC 1918 Private
  { start: "192.168.0.0", end: "192.168.255.255" }, // RFC 1918 Private
  { start: "169.254.0.0", end: "169.254.255.255" }, // Link-Local / Cloud Metadata
  { start: "0.0.0.0", end: "0.255.255.255" }, // Current Network
];

function ipToLong(ip) {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function isPrivateOrReservedIp(ipStr) {
  // IPv6 Denetimi
  // IPv6 adreslerini kontrol et, özel ve rezerve edilmiş blokları reddet
  if (ipStr.includes(":")) {
    // IPv6, : içeriyorsa bu bir IPv6 adresidir
    const normalized = ipStr.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true; // ::1 (loopback) ve :: (unspecified),
    if (normalized.startsWith("fe80:")) return true; // fe80::/10 ile başlayan link-local adresler, link-local adresler, dahili ağlar için kullanılır ve dışarıdan erişilemez.
    if (normalized.startsWith("fc00:") || normalized.startsWith("fd00:"))
      // fc00::/7 ile başlayan Unique Local Address (ULA) blokları, dahili ağlar için kullanılır ve dışarıdan erişilemez.
      return true; // ULA

    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.includes("::ffff:")) {
      // IPv4-mapped IPv6 adreslerini kontrol et, IPv4-mapped IPv6 adresleri, IPv4 adreslerini IPv6 formatında temsil eden özel bir formattır. Örneğin, ::ffff:127.0.0.1 IPv4-mapped IPv6 adresi,
      const ipv4Part = normalized.split("::ffff:")[1]; // IPv4 kısmını al
      if (net.isIPv4(ipv4Part)) return isPrivateOrReservedIp(ipv4Part); // IPv4 kısmını kontrol et, özel veya rezerve edilmiş IP'leri reddet
    }
    return true; // Test ortamında tüm dahili IPv6'ları kısıtla
  }

  // IPv4 Denetimi
  if (!net.isIPv4(ipStr)) return true; // Geçersiz IPv4 adreslerini reddet
  const ipLong = ipToLong(ipStr); // IPv4 adresini uzun tamsayıya çevir
  return BLOCKED_IPV4_RANGES.some(
    (r) => ipLong >= ipToLong(r.start) && ipLong <= ipToLong(r.end),
  ); // IP adresinin yasaklı aralıkta olup olmadığını kontrol et
}

// 2. KAPSAMLI SSRF SAVUNMA BORU HATTI
async function safeFetchPipeline(targetUrl, maxRedirects = 3) {
  if (maxRedirects < 0) {
    throw new Error("SSRF Engeli: Çok fazla yönlendirme (Redirect Loop).");
  }

  // 1. Canonical Parsing & Scheme Whitelist
  // URL'yi ayrıştır ve şema doğrulaması yap, sadece http/https izinli
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new Error("SSRF Engeli: Geçersiz URL formatı.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `SSRF Engeli: Desteklenmeyen şema (${parsed.protocol}). Sadece http/https izinli.`,
    );
  }

  // 2. DNS Resolution
  // Hostname'i çözümle ve IP adreslerini al
  const hostname = parsed.hostname;
  let resolvedIps = [];

  // Eğer hostname zaten bir IP ise, doğrudan kullan, aksi takdirde DNS çözümlemesi yap
  if (net.isIP(hostname)) {
    resolvedIps = [hostname];
  } else {
    try {
      // DNS çözümlemesi yap ve tüm IP adreslerini al, IPv4 ve IPv6 dahil.
      const records = await dns.lookup(hostname, { all: true });
      resolvedIps = records.map((r) => r.address);
    } catch (e) {
      throw new Error(`SSRF Engeli: DNS çözümlenemedi (${hostname}).`);
    }
  }

  // 3. Resolved IP Validation
  // Her bir çözümlenen IP'yi kontrol et, özel veya rezerve edilmiş IP'leri reddet
  for (const ip of resolvedIps) {
    if (isPrivateOrReservedIp(ip)) {
      throw new Error(
        `SSRF Engeli: Hedef IP özel veya rezerve edilmiş blokta (${ip}).`,
      );
    }
  }

  const chosenIp = resolvedIps[0];
  const port = parsed.port || (parsed.protocol === "https:" ? 443 : 80);

  // 4. DNS Pinning Socket İle İstek Yap (TOCTOU Engeli)
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: chosenIp, // Soket onaylı IP'ye açılır
        port: port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          Host: hostname, // Sanal host yönlendirmesi için orijinal Host korunur
          "User-Agent": "Hardened-SSRF-Pipeline/1.0",
        },
        timeout: 3000,
      },
      (res) => {
        // 5. Redirect Re-Validation (301, 302, 307, 308)
        if (
          [301, 302, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          const nextUrl = new URL(res.headers.location, targetUrl).href;
          console.log(
            `[*] Yönlendirme tespit edildi -> ${nextUrl}. Yeniden doğrulanıyor...`,
          );
          req.destroy();
          return resolve(safeFetchPipeline(nextUrl, maxRedirects - 1));
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("İstek zaman aşımı."));
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}

// 3. LABORATUVAR HTTP SUNUCUSU
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // A. Dahili Gizli Servis (Sadece localhost erişimine açık olmalı)
  if (parsedUrl.pathname === "/internal/cloud-metadata") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({ aws_role: "arn:aws:iam::123:role/secret-vault-admin" }),
    );
  }

  // B. Kötü Niyetli Yönlendirme Simülatörü
  // Dışarı açık bir domain gibi görünür ama iç ağa 302 basar
  if (parsedUrl.pathname === "/redirect-to-internal") {
    res.writeHead(302, {
      Location: "http://127.0.0.1:3022/internal/cloud-metadata",
    });
    return res.end();
  }

  // C. ZAFİYETLİ SSRF UÇ NOKTASI (Klasik fetch)
  if (parsedUrl.pathname === "/api/vulnerable/fetch") {
    const target = parsedUrl.query.url;
    // Klasik SSRF: Doğrudan hedefe istek yapar, hiçbir doğrulama yok,
    http
      .get(target, (proxyRes) => {
        let d = "";
        proxyRes.on("data", (c) => (d += c)); // Veri toplama
        proxyRes.on("end", () => {
          // Yanıtı istemciye ilet
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "SUCCESS", content: d }));
        });
      })
      .on("error", (err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });
    return;
  }

  // D. SIKILAŞTIRILMIŞ SSRF UÇ NOKTASI (Boru Hattı Korumalı)
  if (parsedUrl.pathname === "/api/hardened/fetch") {
    const target = parsedUrl.query.url;
    try {
      const result = await safeFetchPipeline(target);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "SUCCESS", result }));
    } catch (err) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(3022, "127.0.0.1", () => {
  console.log(
    "[+] Gün 7 SSRF Laboratuvar Sunucusu 127.0.0.1:3022 üzerinde hazır.",
  );
});
