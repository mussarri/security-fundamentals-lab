const http = require("http");
const url = require("url");

http
  .createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    const searchTerm = query.q || "";

    // 1. ZAFİYETLİ ROTA: CSP Başlığı YOK
    if (pathname === "/vulnerable") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Zafiyetli Sayfa (No CSP)</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h2>Zafiyetli Arama (CSP Yok)</h2>
        <div style="padding: 15px; background: #1e293b; border-radius: 6px;">
          Aranan kelime: <strong>${searchTerm}</strong>
        </div>
      </body>
      </html>
    `);
      return;
    }

    // 2. SIKILAŞTIRILMIŞ ROTA: Katı CSP Başlığı AKTİF
    if (pathname === "/hardened-csp") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        // KATI CSP POLİTİKASI:
        // - Sadece kendi originimizden dosya yükle
        // - Sayfa içi inline betikleri ve eval() fonksiyonunu YASAKLA
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';",
      });

      res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Sıkılaştırılmış Sayfa (CSP Aktif)</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h2>Sıkılaştırılmış Arama (CSP Koruması Aktif)</h2>
        <p>HTML içinde kaçışlama olmasa bile CSP bu payload'u çalıştırmaz.</p>
        <div style="padding: 15px; background: #1e293b; border-radius: 6px;">
          Aranan kelime: <strong>${searchTerm}</strong>
        </div>
      </body>
      </html>
    `);
      return;
    }

    // 1. ZAFİYETLİ ARAMA SAYFASI (Reflected XSS)
    if (pathname === "/search") {
      const searchTerm = query.q || "";

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      // TEHLİKE: Kullanıcı girdisi (searchTerm) hiçbir kaçış (escape) işleminden
      // geçirilmeden doğrudan HTML içine gömülüyor:
      res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Arama Motoru - XSS Lab</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h2>Ürün Arama Paneli</h2>
        <form method="GET" action="/search">
          <input type="text" name="q" value="${searchTerm}" placeholder="Aranacak kelime..." style="padding: 8px; width: 300px;" />
          <button type="submit" style="padding: 8px 16px; cursor: pointer;">Ara</button>
        </form>

        <div style="margin-top: 20px; padding: 15px; background: #1e293b; border-radius: 6px;">
          Aranan ifade: <strong>${searchTerm}</strong>
        </div>

        <p id="result-status" style="color: #94a3b8; margin-top: 10px;">Sonuç bulunamadı.</p>
      </body>
      </html>
    `);
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  })
  .listen(3000, () => {
    console.log("[+] XSS Lab Sunucusu çalışıyor: http://localhost:3000/search");
  });
