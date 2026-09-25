const http = require('http');
const url = require('url');
const crypto = require('crypto');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const q = escapeHtml(parsedUrl.query.q || '');
  const nonce = crypto.randomBytes(16).toString('base64');

  // Katı CSP + Nonce Tabanlı Güvenli Yapılandırma
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self';`
  });

  res.end(`
    <!DOCTYPE html>
    <html>
    <body>
      <div>Aranan: ${q}</div>
      <script nonce="${nonce}">
        // Bu meşru script nonce eşleştiği için güvenle çalışır
        console.log("Güvenilir uygulama betiği başarıyla çalıştı.");
      </script>
    </body>
    </html>
  `);
}).listen(3002, () => {
  console.log('[+] Sıkılaştırılmış CSP API dinlemede: 3002');
});
