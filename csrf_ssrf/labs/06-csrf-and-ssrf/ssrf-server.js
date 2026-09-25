const http = require('http');
const url = require('url');

// 1. İÇ AĞ SERVİSİ: Cloud Metadata / Internal Admin (Port 8000)
// Bu servis normalde dış internete kapalıdır, sadece localhost dinler.
http.createServer((req, res) => {
  console.log(`[İÇ AĞ SERVİSİ (8000)] İstek Geldi -> URL: ${req.url}`);

  if (req.url === '/latest/meta-data/iam/security-credentials/admin-role') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      AccessKeyId: "AKIA_FAKE_SECRET_KEY_12345",
      SecretAccessKey: "v8B9+fake_aws_secret_key_abcdef998877",
      Token: "token_abc123_full_cloud_takeover",
      Expiration: "2026-12-31T23:59:59Z"
    }));
    return;
  }

  if (req.url === '/admin/debug') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Dahili Sistem Durumu: TÜM SERVİSLER AKTİF | DB_PASS: root_pass_9988");
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(8000, '127.0.0.1', () => {
  console.log('[+] Dahili Gizli Metadata Servisi çalışıyor: http://127.0.0.1:8000');
});

// 2. DIŞARI AÇIK WEBSİTESİ / API (Port 3000)
// Kullanıcıdan URL alıp içeriğini getiren zafiyetli uç nokta
http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/fetch-preview') {
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Hata: url parametresi gerekli (Orn: ?url=https://example.com)');
      return;
    }

    console.log(`[DIŞ API (3000)] Kullanıcı isteği aldı, sunucu istek atıyor -> ${targetUrl}`);

    // ZAFİYETLİ KOD: Kullanıcı girdisi hiçbir IP/Host kontrolünden geçirilmeden
    // doğrudan sunucu tarafından sorgulanıyor!
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`--- Sunucunun Çektiği Veri ---\n${text}`);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`İstek hatası: ${err.message}`);
    }
    return;
  }

  res.writeHead(404);
  res.end('Endpoint: /fetch-preview?url=...');
}).listen(3000, () => {
  console.log('[+] Dışarıya Açık Zafiyetli API çalışıyor: http://localhost:3000');
});
