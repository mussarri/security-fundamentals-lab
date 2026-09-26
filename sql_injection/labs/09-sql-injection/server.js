const http = require('http');
const url = require('url');
const sqlite3 = require('sqlite3').verbose();

// Bellek içi geçici SQLite veritabanı kur
const db = new sqlite3.Database(':memory:');

// Veritabanı şemasını oluştur ve örnek veri bas
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, secret_note TEXT)");
  
  const stmt = db.prepare("INSERT INTO users (username, password, role, secret_note) VALUES (?, ?, ?, ?)");
  stmt.run("admin", "SuperSecretAdminPassword2026!", "admin", "KRİTİK_BAYRAK: FLAG{SQLI_AUTH_BYPASS_CONFIRMED}");
  stmt.run("ahmet", "ahmet1234", "user", "Ahmet kişisel notu");
  stmt.run("mehmet", "mehmet5678", "user", "Mehmet kişisel notu");
  stmt.finalize();
});

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // 1. ZAFİYETLİ ENDPOINT: String Concatenation ile Login
  // POST /api/vulnerable/login (body: username & password)
  if (parsedUrl.pathname === '/api/vulnerable/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data = {};
      try { data = JSON.parse(body); } catch(e) { return res.end("Geçersiz JSON"); }

      const username = data.username || '';
      const password = data.password || '';

      // KRİTİK GÜVENLİK AÇIĞI: String Interpolation ile sorgu inşası
      const query = `SELECT id, username, role, secret_note FROM users WHERE username = '${username}' AND password = '${password}'`;
      console.log(`[!] ÇALIŞTIRILAN DİNAMİK SQL: ${query}`);

      db.get(query, (err, row) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "SQL Hatası: " + err.message }));
        }

        if (row) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            status: "SUCCESS",
            message: "Giriş Başarılı!",
            user: { id: row.id, username: row.username, role: row.role, secret_note: row.secret_note }
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Geçersiz kullanıcı adı veya şifre" }));
        }
      });
    });
    return;
  }

  // 2. SIKILAŞTIRILMIŞ ENDPOINT: Parameterized Queries (Prepared Statements)
  // POST /api/hardened/login
  if (parsedUrl.pathname === '/api/hardened/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data = {};
      try { data = JSON.parse(body); } catch(e) { return res.end("Geçersiz JSON"); }

      const username = data.username || '';
      const password = data.password || '';

      // SIKILAŞTIRILMIŞ ÇÖZÜM: Parametreli Placeholder (?) kullanımı
      const query = `SELECT id, username, role, secret_note FROM users WHERE username = ? AND password = ?`;
      console.log(`[+] GÜVENLİ PARAMETRELİ SQL ÇALIŞIYOR: ${query} [Params: ${username}, ***]`);

      db.get(query, [username, password], (err, row) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Veritabanı hatası" }));
        }

        if (row) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            status: "SUCCESS",
            message: "Giriş Başarılı!",
            user: { id: row.id, username: row.username, role: row.role, secret_note: row.secret_note }
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Geçersiz kullanıcı adı veya şifre" }));
        }
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3008, () => {
  console.log('[+] SQL Injection Laboratuvarı çalışıyor: http://localhost:3008');
});
