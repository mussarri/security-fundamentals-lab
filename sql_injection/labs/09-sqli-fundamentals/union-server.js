const http = require('http');
const url = require('url');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');

// Veritabanı şeması ve test verileri
db.exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL
  );

  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    credit_card TEXT NOT NULL
  );

  INSERT INTO products (name, price, category) VALUES
    ('Dizüstü Bilgisayar', 25000.0, 'elektronik'),
    ('Kablosuz Kulaklık', 1500.0, 'elektronik'),
    ('Çalışma Masası', 3500.0, 'mobilya');

  INSERT INTO users (username, credit_card) VALUES
    ('admin', '4111-2222-3333-4444'),
    ('ahmet', '5500-0000-1111-2222');
`);

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/api/products') {
    const category = parsedUrl.query.category || '';

    // ZAFİYETLİ KOD: String birleştirme
    const query = `SELECT id, name, price FROM products WHERE category = '${category}';`;

    try {
      const rows = db.prepare(query).all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: "SUCCESS", count: rows.length, data: rows }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3010, () => {
  console.log('[+] UNION SQLi Laboratuvarı port 3010 üzerinde aktif.');
});