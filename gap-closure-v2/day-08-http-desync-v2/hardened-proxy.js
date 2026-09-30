const http = require('http');

const hardenedProxy = http.createServer((req, res) => {
  const hasCl = 'content-length' in req.headers;
  const hasTe = 'transfer-encoding' in req.headers;

  // RFC 7230 Section 3.3.3 & RFC 9112 Section 6.1 Savunması, hasCl ve hasTe başlıklarının aynı anda bulunmasını engeller. Bu, HTTP Desync saldırılarını önlemek için kritik bir savunmadır. Eğer hem Content-Length hem de Transfer-Encoding başlıkları mevcutsa, bu bir RFC ihlali olarak kabul edilir ve istek reddedilir.
  if (hasCl && hasTe) {
    console.log('[!] [HARDENED PROXY] Desync atağı engellendi: Hem CL hem TE başlığı mevcut!');
    res.writeHead(400, { 'Content-Type': 'application/json', 'Connection': 'close' });
    return res.end(JSON.stringify({
      error: "RFC 7230 Violation: Mutually exclusive Content-Length and Transfer-Encoding headers.",
      code: "DESYNC_BLOCKED"
    }));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: "SAFE", url: req.url }));
});

hardenedProxy.listen(4010, '127.0.0.1', () => {
  console.log('[+] Sıkılaştırılmış RFC Savunma Proxy 127.0.0.1:4010 üzerinde hazır.');
});
