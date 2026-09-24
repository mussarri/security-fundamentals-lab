const http = require("http");

// 1. FRONTEND SUNUCUSU (Port 3000)
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>CORS Preflight Lab</title></head>
    <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
      <h2>Origin: <span style="color: #38bdf8;">http://localhost:3000</span></h2>
      <p>Aşağıdaki iki farklı isteği test et ve terminaldeki logları incele:</p>

      <div style="margin-bottom: 20px;">
        <button onclick="sendSimple()" style="padding: 10px 20px; font-size: 14px; background: #22c55e; border: none; cursor: pointer; color: white; border-radius: 4px;">
          1. Basit İstek Gönder (GET - No Preflight)
        </button>
      </div>

      <div style="margin-bottom: 20px;">
        <button onclick="sendComplex()" style="padding: 10px 20px; font-size: 14px; background: #ef4444; border: none; cursor: pointer; color: white; border-radius: 4px;">
          2. Karmaşık İstek Gönder (DELETE + JSON Header - Preflight Gerekir!)
        </button>
      </div>

      <pre id="output" style="padding: 15px; background: #1e293b; border: 1px solid #334155; border-radius: 6px;">Sonuçlar buraya gelecek...</pre>

      <script>
        const out = document.getElementById('output');

        // 1. SIMPLE REQUEST: Preflight tetiklemez
        async function sendSimple() {
          out.innerText = "Basit GET isteği gönderiliyor...";
          try {
            const res = await fetch('http://localhost:4000/api/data');
            const data = await res.json();
            out.innerText = "BAŞARILI (Simple): " + JSON.stringify(data);
          } catch (e) {
            out.innerText = "HATA: " + e.message;
          }
        }

        // 2. NON-SIMPLE REQUEST: Tarayıcı önce OPTIONS atmak zorundadır
        async function sendComplex() {
          out.innerText = "DELETE + Custom Header gönderiliyor...";
          try {
            const res = await fetch('http://localhost:4000/api/users/42', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'X-Custom-Auth': 'secret-token-xyz'
              }
            });
            const data = await res.json();
            out.innerText = "BAŞARILI (Complex): " + JSON.stringify(data);
          } catch (e) {
            out.innerText = "HATA (Preflight reddedildi mi?): " + e.message;
          }
        }
      </script>
    </body>
    </html>
  `);
  })
  .listen(3000, () => console.log("[+] Frontend: http://localhost:3000"));

// 2. BACKEND API SUNUCUSU (Port 4000)
http
  .createServer((req, res) => {
    const origin = req.headers.origin;
    console.log(
      `\n>>> [API 4000] Gelen İstek -> Method: ${req.method} | URL: ${req.url}`,
    );

    // PREFLIGHT (OPTIONS) İSTEĞİ GELDİĞİNDE
    // if (req.method === "OPTIONS") {
    //   console.log("[!] PREFLIGHT UÇUŞU YAKALANDI!");
    //   console.log(
    //     "    - İstenen Metot (Access-Control-Request-Method):",
    //     req.headers["access-control-request-method"],
    //   );
    //   console.log(
    //     "    - İstenen Başlıklar (Access-Control-Request-Headers):",
    //     req.headers["access-control-request-headers"],
    //   );

    //   // ŞİMDİLİK PREFLIGHT'A İZİN VERMEYELİM (Zafiyet / Eksik Konfigürasyon Simülasyonu)
    //   res.writeHead(204);
    //   res.end();
    //   return;
    // }

    // Doğru Preflight Karşılama
    if (req.method === "OPTIONS") {
      if (origin === "http://localhost:3000") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Custom-Auth",
          "Access-Control-Max-Age": "86400", // 24 saat preflight önbelleği
        });
        res.end();
        return;
      }
      res.writeHead(403);
      res.end();
      return;
    }

    // Standart CORS Başlığı
    if (origin === "http://localhost:3000") {
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    }

    if (req.url === "/api/data" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", type: "simple_get" }));
      return;
    }

    if (req.url === "/api/users/42" && req.method === "DELETE") {
      console.log("[!!!] KRİTİK: Kullanıcı 42 silindi!");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "deleted", userId: 42 }));
      return;
    }

    res.writeHead(404);
    res.end();
  })
  .listen(4000, () => console.log("[+] Backend API: http://localhost:4000"));
