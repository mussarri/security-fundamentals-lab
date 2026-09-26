const http = require('http');
const url = require('url');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    pin TEXT NOT NULL
  );

  INSERT INTO users (username, pin) VALUES 
    ('admin', '7391'),
    ('ahmet', '1234');
`);

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Uç Nokta: Kullanıcı varlık kontrolü (Sessiz API)
  // GET /api/user-exists?username=...
  if (parsedUrl.pathname === '/api/user-exists') {
    const rawUsername = parsedUrl.query.username || '';

    // ZAFİYETLİ SORGU: Hiçbir veri veya hata dışarı sızmıyor
    const query = `SELECT id FROM users WHERE username = '${rawUsername}';`;

    try {
      const rows = db.prepare(query).all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Sadece var/yok mantığı (Boolean oracle)
      return res.end(JSON.stringify({ exists: rows.length > 0 }));
    } catch (err) {
      // Hata olsa dahi istemciye tek kelime sızdırılmaz
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ exists: false }));
    }
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3012, () => {
  console.log('[+] Blind SQLi Laboratuvarı port 3012 üzerinde aktif.');
});
