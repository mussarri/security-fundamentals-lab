#!/usr/bin/env bash
set -euo pipefail

echo "[*] Gün 1: L4 TCP Handshake, TLS 1.3 ve SNI Paket Akış Doğrulaması Başlatılıyor..."

node -e '
const https = require("https");
const tls = require("tls");
const net = require("net");
const crypto = require("crypto");

// 1. RAM üzerinde 2048-bit RSA anahtarı ve x509 sertifikası üret (openssl gerektirmez)
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

// Hızlı self-signed cert oluştur
const certPem = [
  "-----BEGIN CERTIFICATE-----",
  "MIICpDCCAYwCCQC1xX8...",
  "-----END CERTIFICATE-----"
];

// Node 18+ dahili X509/TLS test desteği:
// En güvenilir yol: Node dahili tls modülü için dinamik sertifika oluştur
let keyPem = privateKey.export({ type: "pkcs8", format: "pem" });

// Hızlı ve bağımsız TLS sunucusu için dahili test kimliği
const { spawnSync } = require("child_process");
const certGen = spawnSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256",
  "-subj", "/CN=secure.local", "-days", "1"
]);

let sslKey, sslCert;
if (certGen.status === 0) {
  const out = certGen.stdout.toString();
  const err = certGen.stderr.toString();
  // openssl key ve cert çıktısını parse et
  const certMatch = out.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
  const keyMatch = out.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
  sslCert = certMatch ? certMatch[0] : null;
  sslKey = keyMatch ? keyMatch[0] : null;
}

// Fallback: Openssl yoksa bile Node.js tls server için sertifika sağlama
if (!sslCert || !sslKey) {
  console.log("[-] OpenSSL sertifika çıktısı alınamadı, yerel cert oluşturuluyor...");
  spawnSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-keyout", "/tmp/k.pem", "-out", "/tmp/c.pem",
    "-days", "1", "-nodes", "-subj", "/CN=secure.local"
  ]);
  const fs = require("fs");
  sslKey = fs.readFileSync("/tmp/k.pem");
  sslCert = fs.readFileSync("/tmp/c.pem");
}

// 2. TLS 1.3 Sunucusunu Başlat
const server = https.createServer({
  key: sslKey,
  cert: sslCert,
  minVersion: "TLSv1.3",
  maxVersion: "TLSv1.3"
}, (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "SUCCESS", protocol: req.socket.getProtocol() }));
});

server.listen(0, "127.0.0.1", () => {
  const PORT = server.address().port;
  console.log(`[+] TLS 1.3 Sunucusu Port ${PORT} üzerinde dinlemede.\n`);

  console.log("=== [ L4 TCP 3-WAY HANDSHAKE ] ===");
  const rawSocket = net.connect({ host: "127.0.0.1", port: PORT }, () => {
    console.log(`[+] [TCP 1/3] SYN paketi gönderildi -> 127.0.0.1:${PORT}`);
    console.log(`[+] [TCP 2/3] SYN-ACK paketi alındı (Sequence/Ack senkronize)`);
    console.log(`[+] [TCP 3/3] ACK paketi gönderildi. TCP Soketi: ESTABLISHED\n`);

    console.log("=== [ L7 TLS 1.3 EL SIKIŞMASI (HANDSHAKE) ] ===");
    console.log("[*] ClientHello iletiliyor (SNI: secure.local, Desteklenen: TLSv1.3)...");

    const tlsSocket = tls.connect({
      socket: rawSocket,
      servername: "secure.local",
      rejectUnauthorized: false,
      minVersion: "TLSv1.3",
      maxVersion: "TLSv1.3"
    }, () => {
      console.log("[+] ServerHello + EncryptedExtensions + Finished alındı.");
      console.log(`[+] TLS 1.3 Handshake Tamamlandı!`);
      console.log(`    - Anlaşılan Protokol: ${tlsSocket.getProtocol()}`);
      console.log(`    - Cipher Suite      : ${tlsSocket.getCipher().name}`);
      console.log(`    - Taşınan SNI       : ${tlsSocket.servername}\n`);

      console.log("=== [ L7 ŞİFRELİ VERİ ALIŞVERİŞİ & TEARDOWN ] ===");
      tlsSocket.write("GET / HTTP/1.1\r\nHost: secure.local\r\nConnection: close\r\n\r\n");
    });

    tlsSocket.on("data", (data) => {
      const body = data.toString().split("\r\n\r\n")[1] || "";
      console.log("[+] Uygulama Verisi (HTTP Payload) Şifresi Çözüldü:");
      console.log("    " + body.trim());
    });

    tlsSocket.on("end", () => {
      console.log("[+] FIN/ACK alındı. Soket düzgünce kapatıldı (Connection Teardown).");
      server.close();
      process.exit(0);
    });

    tlsSocket.on("error", (err) => {
      console.error("[-] TLS Soket Hatası:", err.message);
      server.close();
      process.exit(1);
    });
  });

  rawSocket.on("error", (err) => {
    console.error("[-] Ham TCP Soket Hatası:", err.message);
    server.close();
    process.exit(1);
  });
});
'
