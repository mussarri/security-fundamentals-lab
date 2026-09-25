const http = require('http');
const url = require('url');
const dns = require('dns').promises;
const net = require('net');

// Özel ve Yasaklı IP Aralıklarını Denetleyen Fonksiyon
function isPrivateIp(ip) {
  // IPv6 Loopback / Link-local
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }

  // IPv4 Blokları
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0 - 172.31.255.255 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-Local / Cloud Metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  return false;
}

http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/fetch-preview') {
    const rawTarget = parsedUrl.query.url;

    if (!rawTarget) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Hata: url parametresi gerekli');
    }

    try {
      const targetObj = new URL(rawTarget);

      // 1. Protokol Doğrulaması (Sadece HTTP ve HTTPS)
      if (targetObj.protocol !== 'http:' && targetObj.protocol !== 'https:') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Engellendi: Yalnızca HTTP ve HTTPS protokolleri kabul edilir.');
      }

      // 2. DNS Çözümlemesi (Domain -> IP)
      const lookupResult = await dns.lookup(targetObj.hostname);
      const resolvedIp = lookupResult.address;

      console.log(`[Doğrulama] Host: ${targetObj.hostname} -> Çözülen IP: ${resolvedIp}`);

      // 3. Dahili / Özel IP Denetimi (SSRF Engelleme)
      if (isPrivateIp(resolvedIp)) {
        console.log(`[!] ENGELLEME: İç ağ / Localhost / Metadata erişim girişimi engellendi! IP: ${resolvedIp}`);
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`Güvenlik Uyarısı: Hedef IP adresi (${resolvedIp}) iç ağda yer alıyor. İstek reddedildi.`);
      }

      // Güvenli İstek
      const response = await fetch(rawTarget);
      const text = await response.text();
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`--- Güvenli Şekilde Alınan Veri ---\n${text.substring(0, 300)}`);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Hata: ${err.message}`);
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3003, () => {
  console.log('[+] Sıkılaştırılmış SSRF API (Port 3003) dinlemede');
});
