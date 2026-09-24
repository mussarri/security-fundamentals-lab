const http = require('http');

// GÜVENLİ: Yalnızca açıkça tanımlanmış güvenilir kökenlere izin verilir
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://kargaa.com',
  'https://admin.kargaa.com'
]);

http.createServer((req, res) => {
  const origin = req.headers.origin;

  // Strict Whitelist Kontrolü
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin'); // Cache zehirlenmesini önlemek için şart
  }

  if (req.url === '/api/secret') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session_token=mustafa_gizli_oturum_123; HttpOnly; Secure; SameSite=Strict; Path=/'
    });

    res.end(JSON.stringify({
      user: "mustafa",
      balance: "$100,000",
      secretToken: "sk_live_998877665544"
    }));
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(4000, () => {
  console.log('[+] Sıkılaştırılmış CORS API çalışıyor: http://localhost:4000');
});
