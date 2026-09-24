const http = require('http');

// ZAFİYETLİ: Gelen her Origin'i körü körüne yansıtan (Reflection) sunucu
http.createServer((req, res) => {
  const origin = req.headers.origin;

  if (req.url === '/api/secret') {
    // TEHLİKE: Gelen origin ne olursa olsun izin veriliyor ve Credentials açık
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session_token=mustafa_gizli_oturum_123; HttpOnly; Path=/'
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
  console.log('[!] Zafiyetli CORS API çalışıyor: http://localhost:4000');
});
