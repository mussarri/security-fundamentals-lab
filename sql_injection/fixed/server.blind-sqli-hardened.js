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

  if (parsedUrl.pathname === '/api/user-exists') {
    const rawUsername = parsedUrl.query.username || '';

    // MİMARİ KORUMA: Parametreli Derleme
    const stmt = db.prepare('SELECT id FROM users WHERE username = ?;');

    try {
      const rows = stmt.all(rawUsername);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ exists: rows.length > 0 }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ exists: false }));
    }
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3013, () => {
  console.log('[+] Sıkılaştırılmış Blind SQLi API dinlemede: 3013');
});
