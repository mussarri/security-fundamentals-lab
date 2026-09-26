const http = require('http');
const url = require('url');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  );

  INSERT INTO users (username, password, role) VALUES 
    ('admin', 'SuperSecretPass2026!', 'admin'),
    ('ahmet', 'ahmet1234', 'user');
`);

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const user = params.get('username') || '';
      const pass = params.get('password') || '';

      // MİMARİ SAVUNMA: Prepared Statement ve Parameter Binding
      const stmt = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?;');

      try {
        const rows = stmt.all(user, pass);

        if (rows.length > 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: "SUCCESS", user: rows[0] }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Hatalı kimlik bilgileri." }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "İç sunucu hatası" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3009, () => {
  console.log('[+] Sıkılaştırılmış SQLi Korumalı API dinlemede: 3009');
});
