const http = require('http');
const url = require('url');
const crypto = require('crypto');

// Hatalı / Yetersiz Kaçışlayıcı (Sadece temel HTML Entity çevirir)
function naiveHtmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const input = parsedUrl.query.q || '';

  // 1. ZAFİYETLİ URL BAĞLAMI: naiveHtmlEscape javascript: şemasını ENGELLEMEZ
  // GET /vulnerable/url?q=javascript:alert(1)
  if (parsedUrl.pathname === '/vulnerable/url') {
    const escaped = naiveHtmlEscape(input);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <h1>Profil Bağlantısı (URL Context)</h1>
      <a id="profile-link" href="${escaped}">Kullanıcı Profiline Git</a>
    `);
  }

  // 2. ZAFİYETLİ JS BAĞLAMI: naiveHtmlEscape tırnak kapatmayı ENGELLEMEZ
  // GET /vulnerable/js?q=";alert(1);//
  if (parsedUrl.pathname === '/vulnerable/js') {
    const escaped = naiveHtmlEscape(input);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <h1>JavaScript Context</h1>
      <script>
        let userData = "${escaped}";
        console.log("Kullanıcı yüklendi:", userData);
      </script>
    `);
  }

  // 3. SIKILAŞTIRILMIŞ ÇÖZÜM: Context-Aware Escaping + Strict Nonce CSP
  // GET /hardened?url=...&js=...
  if (parsedUrl.pathname === '/hardened') {
    const rawUrl = parsedUrl.query.url || 'https://example.com';
    const rawJs = parsedUrl.query.js || 'anon';

    // A. URL Context Koruması: Scheme Whitelist
    let safeUrl = '#';
    try {
      const parsed = new URL(rawUrl, 'http://localhost');
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeUrl = parsed.href;
      }
    } catch (_) {}

    // B. JavaScript Context Koruması: JSON serialization
    // Not: </script> tag injection'ı önlemek için < karakteri \u003c yapılır
    const safeJs = JSON.stringify(rawJs).replace(/</g, '\\u003c');

    // C. Defense-in-Depth: Strict Nonce-based CSP
    const nonce = crypto.randomBytes(16).toString('base64');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`
    });

    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Sıkılaştırılmış Sayfa</title></head>
      <body>
        <h1>Güvenli Bağlamlar ve CSP</h1>
        <a id="safe-link" href="${safeUrl}">Güvenli Link</a>
        <script nonce="${nonce}">
          let safeUserData = ${safeJs};
          console.log("Güvenli kullanıcı:", safeUserData);
        </script>
      </body>
      </html>
    `);
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(3019, '127.0.0.1', () => {
  console.log('[+] XSS Contexts & CSP Lab 127.0.0.1:3019 üzerinde hazır.');
});
