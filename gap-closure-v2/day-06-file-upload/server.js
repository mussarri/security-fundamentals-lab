const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Magic Bytes İmzaları
const SIGNATURES = {
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  jpeg: Buffer.from([0xFF, 0xD8, 0xFF])
};

function verifyMagicBytes(buffer, type) {
  const sig = SIGNATURES[type];
  if (!sig || buffer.length < sig.length) return false;
  return buffer.subarray(0, sig.length).equals(sig);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // 1. ZAFİYETLİ YÜKLEME: Orijinal dosya adını kullanır, sadece Content-Type'a güvenir
  // POST /api/vulnerable/upload
  if (parsedUrl.pathname === '/api/vulnerable/upload' && req.method === 'POST') {
    const rawFileName = req.headers['x-file-name'] || 'upload.bin';
    const clientMime = req.headers['content-type'] || '';

    // HATA 1: İstemci Content-Type: image/png dediyse geçerli sanıyor
    if (!clientMime.includes('image/png')) {
      return sendJson(400, { error: "Yalnızca PNG yükleyebilirsiniz." });
    }

    // HATA 2: Orijinal isimle web dizinine yazıyor (Path traversal / Web shell riski)
    const destPath = path.join(UPLOAD_DIR, rawFileName);
    const fileStream = fs.createWriteStream(destPath);

    req.pipe(fileStream);
    fileStream.on('finish', () => {
      sendJson(200, {
        status: "UPLOADED_VULNERABLE",
        savedAs: rawFileName,
        path: destPath
      });
    });
    return;
  }

  // 2. SIKILAŞTIRILMIŞ YÜKLEME: UUID İsim, Magic Bytes Doğrulama, Boyut Limiti
  // POST /api/hardened/upload
  if (parsedUrl.pathname === '/api/hardened/upload' && req.method === 'POST') {
    const MAX_SIZE = 1024 * 1024; // 1 MB Kota Limiti
    let totalBytes = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_SIZE) {
        req.destroy(); // Bellek şişmesini önle
        return sendJson(413, { error: "Dosya boyutu çok büyük (Max: 1MB)." });
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (res.writableEnded) return;

      const fileBuffer = Buffer.concat(chunks);
      if (fileBuffer.length === 0) {
        return sendJson(400, { error: "Boş dosya yüklenemez." });
      }

      // KONTROL 1: Magic Bytes Doğrulaması (Gerçek PNG imzası aranır)
      const isRealPng = verifyMagicBytes(fileBuffer, 'png');
      if (!isRealPng) {
        return sendJson(400, { 
          error: "Güvenlik Engeli: Dosya başlığı gerçek bir PNG imzası taşımıyor (Magic Bytes Mismatch)." 
        });
      }

      // KONTROL 2: Rastgele Güvenli İsimlendirme (UUID v4) & Uzantı Kısıtı
      const safeId = crypto.randomUUID();
      const safeFileName = `${safeId}.png`;
      const safePath = path.join(UPLOAD_DIR, safeFileName);

      // KONTROL 3: Yazma İzni Kısıtlaması (chmod 0644 - Çalıştırma yetkisi yok)
      fs.writeFileSync(safePath, fileBuffer, { mode: 0o644 });

      sendJson(200, {
        status: "UPLOADED_SECURE",
        fileId: safeId,
        downloadUrl: `/api/files/download?id=${safeId}`
      });
    });
    return;
  }

  // 3. GÜVENLİ DOSYA SUNUMU (Serving with Strict Headers)
  // GET /api/files/download?id=...
  if (parsedUrl.pathname === '/api/files/download' && req.method === 'GET') {
    const fileId = parsedUrl.query.id || '';
    if (!/^[a-f0-9-]{36}$/.test(fileId)) {
      return sendJson(400, { error: "Geçersiz dosya kimliği." });
    }

    const filePath = path.join(UPLOAD_DIR, `${fileId}.png`);
    if (!fs.existsSync(filePath)) {
      return sendJson(404, { error: "Dosya bulunamadı." });
    }

    // GÜVENLİ SUNUM BAŞLIKLARI:
    // 1. Tarayıcıda script çalışmasını önlemek için attachment zorunluluğu
    // 2. MIME sniffing engeli (nosniff)
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="download.png"',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'"
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    return;
  }

  sendJson(404, { error: "Not Found" });
});

server.listen(4006, '127.0.0.1', () => {
  console.log('[+] File Upload Security Lab 127.0.0.1:4006 üzerinde hazır.');
});
