const http = require("http");

// 1. ORIGIN: Frontend Sunucusu (Port 3000)
// Tarayıcının ziyaret ettiği web sayfası
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>SOP Lab - Frontend</title></head>
    <body style="font-family: sans-serif; padding: 40px; background: #f4f4f9;">
      <h2>Origin: <span style="color: blue;">http://localhost:3000</span></h2>
      <p>Aşağıdaki butona tıklandığında JavaScript, <strong>http://localhost:4000/api/secret</strong> adresine fetch atacak.</p>
      <button onclick="fetchSecret()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Gizli Veriyi Çek</button>
      <div id="output" style="margin-top: 20px; padding: 15px; background: #fff; border: 1px solid #ccc; font-family: monospace;">Konsolu (F12) aç ve butona tıkla...</div>

      <script>
        async function fetchSecret() {
          const out = document.getElementById('output');
          out.innerText = "İstek atılıyor...";
          try {
            const res = await fetch('http://localhost:4000/api/secret');
            const data = await res.json();
            out.innerHTML = "<span style='color: green;'>BAŞARILI: " + JSON.stringify(data) + "</span>";
          } catch (err) {
            out.innerHTML = "<span style='color: red;'>HATA: " + err.message + " (Konsola bak!)</span>";
            console.error("Fetch Hatası:", err);
          }
        }
      </script>
    </body>
    </html>
  `);
  })
  .listen(3000, () => {
    console.log("[+] Frontend (Origin A) çalışıyor: http://localhost:3000");
  });

// 2. ORIGIN: Backend API Sunucusu (Port 4000)
// Hassas veriyi tutan API (Henüz CORS başlığı YOK)
http
  .createServer((req, res) => {
    console.log(
      `[API 4000] İstek geldi! Method: ${req.method} | URL: ${req.url}`,
    );
    const origin = req.headers.origin;
    if (req.url === "/api/secret") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Credentials": "true", // Çerezlere de izin ver
        "Set-Cookie":
          "session_token=mustafa_gizli_oturum_123; HttpOnly; Path=/",
      });
      res.end(
        JSON.stringify({
          user: "mustafa",
          balance: "$100,000",
          secretToken: "sk_live_998877665544",
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  })
  .listen(4000, () => {
    console.log("[+] Backend API (Origin B) çalışıyor: http://localhost:4000");
  });
