const http = require('http');
const url = require('url');
const crypto = require('crypto');

const JWT_SECRET = "super_gizli_sunucu_anahtari_2026";

// Base64URL Yardımcıları
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

// 1. Meşru Kullanıcıya Normal Token Üretme Fonksiyonu (HS256)
function generateLegitToken(username, role) {
  const header = JSON.stringify({ alg: "HS256", typ: "JWT" });
  const payload = JSON.stringify({ user: username, role: role, iat: Date.now() });

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // 1. Giriş Endpoint'i: Standart kullanıcı token'ı dağıtır
  if (parsedUrl.pathname === '/login') {
    const token = generateLegitToken("mustafa", "user");
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: "Giriş başarılı! Normal kullanıcı rolü (user) verildi.",
      token: token
    }));
    return;
  }

  // 2. ZAFİYETLİ ENDPOINT: alg: none kabul eden admin rotası
  if (parsedUrl.pathname === '/api/vulnerable/admin') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Token bulunamadı!" }));
    }

    const token = authHeader.split(' ')[1];
    const parts = token.split('.');
    if (parts.length < 2) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Geçersiz token formatı" }));
    }

    try {
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));

      // KRİTİK HATA: Geliştirici alg değerini doğrudan header'dan okuyor
      // ve "none" gelirse imza doğrulamayı atlıyor!
      if (header.alg && header.alg.toLowerCase() === 'none') {
        console.log(`[!] ZAFİYET TETİKLENDİ: alg=none kabul edildi! Kullanıcı: ${payload.user}, Rol: ${payload.role}`);
      } else if (header.alg === 'HS256') {
        const expectedSig = crypto
          .createHmac('sha256', JWT_SECRET)
          .update(`${parts[0]}.${parts[1]}`)
          .digest('base64')
          .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        if (parts[2] !== expectedSig) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Geçersiz imza! Token tahrif edilmiş." }));
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Desteklenmeyen algoritma" }));
      }

      // Yetki Kontrolü
      if (payload.role === 'admin') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          status: "SUCCESS",
          secret_vault: "BAYRAK: FLAG{JWT_NONE_ALGORITHM_BYPASS_CONFIRMED}",
          user: payload.user
        }));
      } else {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Yetkisiz: Rolünüz 'admin' değil!" }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Token çözümlenemedi" }));
    }
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3004, () => {
  console.log('[+] JWT Lab Sunucusu çalışıyor: http://localhost:3004');
});
