const http = require('http');
const url = require('url');
const crypto = require('crypto');

let currentUser = {
  email: "kurban@application.com",
  sessionToken: "session_valid_token_123",
  csrfToken: null
};

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const cookieHeader = req.headers.cookie || '';
  const isAuthenticated = cookieHeader.includes('session=session_valid_token_123');

  // 1. Giriş Sayfası: SameSite=Strict ve Form içi Anti-CSRF Token
  if (parsedUrl.pathname === '/login') {
    // Kriptografik rastgele CSRF token üret
    currentUser.csrfToken = crypto.randomBytes(24).toString('hex');

    // SIKILAŞTIRMA: SameSite=Strict eklendi
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'session=session_valid_token_123; Path=/; HttpOnly; SameSite=Strict'
    });

    res.end(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h2>Banka / Hesap Paneli (Korumalı)</h2>
        <p>Mevcut E-posta: <strong>${currentUser.email}</strong></p>
        
        <form method="POST" action="/api/user/change-email">
          <input type="hidden" name="csrf_token" value="${currentUser.csrfToken}" />
          <input type="email" name="email" placeholder="Yeni E-posta" required />
          <button type="submit">Güncelle</button>
        </form>
      </body>
      </html>
    `);
    return;
  }

  // 2. Hassas İşlem: Çift Doğrulama (Cookie + CSRF Token)
  if (parsedUrl.pathname === '/api/user/change-email' && req.method === 'POST') {
    if (!isAuthenticated) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Oturum çerezi bulunamadı." }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const incomingCsrf = params.get('csrf_token');
      const newEmail = params.get('email');

      // GÜVENLİK KONTROLÜ: Anti-CSRF Token Doğrulaması
      if (!incomingCsrf || incomingCsrf !== currentUser.csrfToken) {
        console.log('[!] ENGELLEME: CSRF Saldırısı tespit edildi ve durduruldu!');
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Geçersiz veya eksik CSRF Token!" }));
        return;
      }

      if (newEmail) currentUser.email = newEmail;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: "success", updatedEmail: currentUser.email }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(4001, () => {
  console.log('[+] Sıkılaştırılmış Banka API (Port 4001) dinlemede');
});
