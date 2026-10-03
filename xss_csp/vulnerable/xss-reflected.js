const http = require("http");
const url = require("url");

// ZAFİYETLİ: Kullanıcı girdisi kaçışlanmadan HTML'e basılıyor ve CSP başlığı yok, bu da XSS saldırılarına yol açabilir. Ornegin , kullanıcı tarafından sağlanan URL 'http://example.com/?q=<script>alert(1)</script>' ise, bu URL HTML içinde kullanıldığında, zararlı script çalıştırılabilir ve XSS saldırısı gerçekleşebilir. Content type basligi var ama, CSP basligi yok. Bu nedenle, tarayıcı zararlı script'i çalıştırabilir ve XSS saldırısı gerçekleşebilir.
http
  .createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const q = parsedUrl.query.q || "";

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<div>Aranan: ${q}</div>`);
  })
  .listen(3001, () => {
    console.log("[!] Zafiyetli XSS API dinlemede: 3001");
  });
