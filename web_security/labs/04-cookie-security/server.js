const http = require('http');

http.createServer((req, res) => {
  // 1. Ana Sayfa: Çerezleri dağıtan ve test arayüzü sunan sayfa
  if (req.url === '/') {
    // İki çerez basıyoruz: Biri zafiyetli, diğeri hardened
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': [
        'insecure_token=plain_token_12345; Path=/',
        'secure_admin_token=super_secret_session_99999; HttpOnly; Path=/'
      ]
    });

    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Cookie Security Lab</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h2>Cookie Güvenlik Bayrakları Laboratuvarı</h2>
        <p>Sunucu iki adet çerez set etti:</p>
        <ul>
          <li><code>insecure_token</code> (Bayraksız)</li>
          <li><code>secure_admin_token</code> (HttpOnly aktif)</li>
        </ul>

        <div style="margin-top: 20px;">
          <button onclick="simulateXSS()" style="padding: 10px 20px; font-size: 14px; background: #ef4444; border: none; cursor: pointer; color: white; border-radius: 4px;">
            Simüle Et: XSS Saldırısı (document.cookie Oku)
          </button>
        </div>

        <pre id="output" style="margin-top: 20px; padding: 15px; background: #1e293b; border: 1px solid #334155; border-radius: 6px;">Konsolu aç (F12) ve butona bas...</pre>

        <script>
          function simulateXSS() {
            const out = document.getElementById('output');
            // Saldırganın sayfaya enjekte ettiği zararlı JS kodu:
            const stolenCookies = document.cookie;
            
            out.innerHTML = "<strong>Saldırganın JavaScript ile Okuyabildiği Çerezler:</strong><br><br>" + (stolenCookies ? stolenCookies : "(Hiçbir çerez okunamadı!)");
            console.log("XSS Payload Çalıştı! document.cookie:", stolenCookies);
          }
        </script>
      </body>
      </html>
    `);
    return;
  }

  // 2. Kontrol Uç Noktası: Tarayıcının HTTP isteğinde çerezleri sunucuya gönderip göndermediği
  if (req.url === '/api/whoami') {
    const receivedCookies = req.headers.cookie || 'Cookie gelmedi!';
    console.log(`[API /whoami] Tarayıcının gönderdiği HTTP Cookie Header: ${receivedCookies}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ receivedCookies }));
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(3000, () => {
  console.log('[+] Cookie Lab Sunucusu çalışıyor: http://localhost:3000');
});
