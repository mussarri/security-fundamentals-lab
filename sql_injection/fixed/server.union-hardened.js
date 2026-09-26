const http = require('http');
const url = require('url');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');

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
    ('MacBook Pro M3', 75000.0, 'elektronik'),
    ('Kablosuz Mekanik Klavye', 3200.0, 'elektronik'),
    ('Ergonomik Koltuk', 8500.0, 'mobilya');

  INSERT INTO users (username, credit_card) VALUES
    ('admin', '4111-2222-3333-4444'),
    ('ahmet_k', '5500-0000-1111-2222');
`);

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/api/products') {
    const category = parsedUrl.query.category || '';

    // SIKILAŞTIRILMIŞ KOD: Parametreli Sorgu (Prepared Statement)
    const stmt = db.prepare('SELECT id, name, price FROM products WHERE category = ?;');

    try {
      const rows = stmt.all(category);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: "SUCCESS", count: rows.length, results: rows }));
    } catch (err) {
      // Hata detayını istemciye sızdırmadan jenerik hata dön
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Sorgu çalıştırılamadı." }));
    }
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3011, () => {
  console.log('[+] Sıkılaştırılmış Ürün Arama API dinlemede: 3011');
});
