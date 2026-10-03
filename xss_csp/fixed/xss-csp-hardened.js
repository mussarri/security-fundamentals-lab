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
    'Content-Type': 'text/html; charset=utf-8', // Güvenli içerik türü, su anlama gelir: tüm içerik UTF-8 olarak kodlanacak ve tarayıcıya güvenli bir şekilde iletilecek. ornegin , <script>alert('XSS')</script> gibi zararlı içerikler HTML olarak yorumlanmayacak ve tarayıcıda çalıştırılmayacak. Bu, XSS saldırılarını önlemeye yardımcı olur.
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self';` // Katı CSP politikası, yalnızca kendi kaynağımızdan gelen içeriklere izin verir ve script'ler için nonce kullanır. Bu, XSS saldırılarını önlemeye yardımcı olur. 'object-src' ve 'base-uri' direktifleri, potansiyel olarak zararlı içeriklerin yüklenmesini engeller. Ornegin , 'object-src' direktifi ile Flash veya Java applet gibi zararlı içeriklerin yüklenmesi engellenir. 'base-uri' direktifi ile, sayfanın temel URI'si yalnızca kendi kaynağımızdan gelen içeriklerle sınırlanır ve potansiyel olarak zararlı yönlendirmeler engellenir.
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
