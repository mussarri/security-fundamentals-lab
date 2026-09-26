const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.crt')),
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3'
};

const server = https.createServer(options, (req, res) => {
  const sni = req.socket.servername || 'N/A';
  const proto = req.socket.getProtocol();
  const cipher = req.socket.getCipher();

  console.log(`[+] TLS Bağlantısı Kabul Edildi:`);
  console.log(`    - SNI: ${sni}`);
  console.log(`    - Protokol: ${proto}`);
  console.log(`    - Cipher: ${cipher.name} (${cipher.version})`);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: "CONNECTED",
    protocol: proto,
    cipher: cipher.name,
    sniReceived: sni,
    message: "L4-L7 Paket Değişimi Başarılı"
  }));
});

server.listen(3443, '127.0.0.1', () => {
  console.log('[+] TLS 1.3 Lab Sunucusu 127.0.0.1:3443 portunda hazır.');
});
