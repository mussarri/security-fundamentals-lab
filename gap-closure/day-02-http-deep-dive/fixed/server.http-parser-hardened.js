const http = require('http');

const server = http.createServer((req, res) => {
  const cl = req.headers['content-length'];
  const te = req.headers['transfer-encoding'];

  // RFC 7230 Section 3.3.3 Savunması: İkisi bir aradaysa reddet!
  if (cl && te) {
    console.log('[!] ENGELLEME: Ambigious Request (Hem CL hem TE mevcut)!');
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: "RFC 7230 Violation: Request contains both Content-Length and Transfer-Encoding.",
      code: "AMBIGUOUS_BOUNDARY_REJECTED"
    }));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: "OK", url: req.url }));
});

server.listen(3016, '127.0.0.1', () => {
  console.log('[+] Sıkılaştırılmış HTTP/1.1 Parser 127.0.0.1:3016 üzerinde hazır.');
});
