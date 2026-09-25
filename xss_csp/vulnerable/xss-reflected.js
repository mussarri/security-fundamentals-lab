const http = require('http');
const url = require('url');

// ZAFİYETLİ: Kullanıcı girdisi kaçışlanmadan HTML'e basılıyor ve CSP başlığı yok
http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const q = parsedUrl.query.q || '';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<div>Aranan: ${q}</div>`);
}).listen(3001, () => {
  console.log('[!] Zafiyetli XSS API dinlemede: 3001');
});
