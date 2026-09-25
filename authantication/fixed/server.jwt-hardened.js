const http = require('http');
const url = require('url');
const crypto = require('crypto');

const JWT_SECRET = "super_gizli_sunucu_anahtari_2026";
// Yalnızca izin verilen algoritmalar listesi (WHITELIST)
const ALLOWED_ALGORITHMS = ['HS256'];

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/api/hardened/admin') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Token bulunamadı!" }));
    }

    const token = authHeader.split(' ')[1];
    const parts = token.split('.');
    
    // İmza parçası eksikse (örn: header.payload.) doğrudan reddet
    if (parts.length !== 3 || !parts[2]) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Geçersiz token yapısı! İmza eksik." }));
    }

    try {
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));

      // 1. GÜVENLİK KONTROLÜ: Algoritma Whitelist Denetimi
      if (!header.alg || !ALLOWED_ALGORITHMS.includes(header.alg)) {
        console.log(`[!] ENGELLEME: İzin verilmeyen veya yasaklı algoritma denemesi -> ${header.alg}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: `Desteklenmeyen veya yasaklı algoritma: ${header.alg}` }));
      }

      // 2. GÜVENLİK KONTROLÜ: Kriptografik İmza Doğrulama
      const expectedSig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${parts[0]}.${parts[1]}`)
        .digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      // Zamanlama saldırılarını (Timing Attack) önlemek için timingSafeEqual
      const sigBuffer = Buffer.from(parts[2]);
      const expectedBuffer = Buffer.from(expectedSig);
      
      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "İmza doğrulaması başarısız! Token tahrif edilmiş." }));
      }

      // 3. Yetkilendirme
      if (payload.role === 'admin') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: "SUCCESS", message: "Hoş geldiniz Admin!" }));
      } else {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Yetkisiz: Rolünüz admin değil!" }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Token parse hatası" }));
    }
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3005, () => {
  console.log('[+] Sıkılaştırılmış JWT API (Port 3005) dinlemede');
});
