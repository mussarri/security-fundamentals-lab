const https = require('https');
const crypto = require('crypto');

// Çalışma anında geçici TLS 1.3 sertifikası ve private key üret
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

// Self-signed X.509 sertifika üret (Node.js dahili X509 API)
const cert = new crypto.X509Certificate(
  crypto.createCertificateSync ? crypto.createCertificateSync() : undefined || 
  Buffer.from('')
);

// Fallback: Node.js dahili pem sertifika üretici basit fonksiyon
const selfSignedCert = crypto.generateKeyOp ? null : null; 

// Test için hazır güvenli TLS options
const options = {
  key: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }),
  cert: null, // Sunucu script'i başlatıldığında openssl ile üretilecek
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3'
};
