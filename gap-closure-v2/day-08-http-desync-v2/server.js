const net = require('net');

// Durum Takibi (Boundary Assertions için)
const logs = {
  backendExecutedRequests: [],
  smuggledCommandHit: false,
  victimResponsePoisoned: false
};

// 1. BACK-END SERVER (Port 4009)
// TE / Chunked öncelikli ayrıştırıcı.
// 0\r\n\r\n gördüğü an HTTP isteğini bitti kabul eder, TCP borusundaki kalan baytları kuyrukta bırakır.
const backendServer = net.createServer((socket) => {
  let streamBuffer = '';

  socket.on('data', (chunk) => {
    streamBuffer += chunk.toString('binary');

    while (streamBuffer.includes('\r\n\r\n')) {
      const headerEnd = streamBuffer.indexOf('\r\n\r\n');
      const headerText = streamBuffer.slice(0, headerEnd);
      const isChunked = /transfer-encoding:\s*chunked/i.test(headerText);

      if (isChunked) {
        // Chunked parsing
        const bodyStart = headerEnd + 4;
        const zeroChunkIndex = streamBuffer.indexOf('0\r\n\r\n', bodyStart);

        if (zeroChunkIndex !== -1) {
          const messageEnd = zeroChunkIndex + 5;
          const fullRequest = streamBuffer.slice(0, messageEnd);
          streamBuffer = streamBuffer.slice(messageEnd); // Kalan baytlar bir sonraki istek için sokette kalır!

          const firstLine = fullRequest.split('\r\n')[0];
          console.log(`[BACKEND] Chunked İstek İşlendi: ${firstLine}`);
          logs.backendExecutedRequests.push(firstLine);

          socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 12\r\nConnection: keep-alive\r\n\r\nNormal Yanit\n");
        } else {
          break; // Henüz 0\r\n\r\n gelmedi, bekle
        }
      } else {
        // Content-Length parsing
        const clMatch = headerText.match(/content-length:\s*(\d+)/i);
        const cl = clMatch ? parseInt(clMatch[1], 10) : 0;
        const messageEnd = headerEnd + 4 + cl;

        if (streamBuffer.length >= messageEnd) {
          const fullRequest = streamBuffer.slice(0, messageEnd);
          streamBuffer = streamBuffer.slice(messageEnd);

          const firstLine = fullRequest.split('\r\n')[0];
          console.log(`[BACKEND] Content-Length İstek İşlendi: ${firstLine}`);
          logs.backendExecutedRequests.push(firstLine);

          if (firstLine.includes('POST /admin/unauthorized-action')) {
            logs.smuggledCommandHit = true;
            socket.write("HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nContent-Length: 26\r\nConnection: keep-alive\r\n\r\nADMIN_ATTACK_INTERCEPTED!\n");
          } else {
            socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 14\r\nConnection: keep-alive\r\n\r\nKurban Profil\n");
          }
        } else {
          break; // Gövdenin tamamı gelmedi
        }
      }
    }
  });
});

backendServer.listen(4009, '127.0.0.1', () => {
  console.log('[+] Back-end HTTP Sunucusu dinlemede: 127.0.0.1:4009 (Chunked Parser)');

  // 2. FRONT-END PROXY (Port 4008)
  // Katı Content-Length ayrıştırıcısı. Arka yüze tek bir paylaşımlı Keep-Alive TCP soketi açar.
  let sharedBackendSocket = null;

  function getBackendSocket() {
    if (!sharedBackendSocket || sharedBackendSocket.destroyed) {
      sharedBackendSocket = net.connect({ host: '127.0.0.1', port: 4009 });
      sharedBackendSocket.on('error', () => {});
    }
    return sharedBackendSocket;
  }

  const proxyServer = net.createServer((clientSocket) => {
    const backend = getBackendSocket();

    // Ön yüz sadece CL baytı kadarını iletir sanır, ancak ham TCP akışını tüneller
    clientSocket.on('data', (data) => {
      backend.write(data);
    });

    const onBackendData = (data) => {
      if (!clientSocket.destroyed) {
        clientSocket.write(data);
      }
    };

    backend.on('data', onBackendData);

    clientSocket.on('close', () => {
      backend.removeListener('data', onBackendData);
    });
  });

  proxyServer.listen(4008, '127.0.0.1', () => {
    console.log('[+] Front-end Proxy dinlemede: 127.0.0.1:4008 (CL Parser + Connection Pooling)');
  });
});
