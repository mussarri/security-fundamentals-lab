const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.resolve(__dirname, 'public_files');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const requestedFile = parsedUrl.query.file || '';

  const sendResponse = (status, contentType, data) => {
    res.writeHead(status, { 'Content-Type': contentType });
    res.end(data);
  };

  // 1. ZAFİYETLİ UÇ NOKTA: Doğrudan path.join
  // GET /api/vulnerable/read?file=../../system_secret.txt
  if (parsedUrl.pathname === '/api/vulnerable/read') {
    if (!requestedFile) return sendResponse(400, 'application/json', JSON.stringify({ error: "file parametresi eksik." }));

    // HATA: Doğrudan join yapılıyor, dizin dışına çıkış denetlenmiyor!
    const targetPath = path.join(PUBLIC_DIR, requestedFile);
    console.log(`[!] Zafiyetli Yol İsteği: ${targetPath}`);

    try {
      const content = fs.readFileSync(targetPath, 'utf8');
      return sendResponse(200, 'text/plain', content);
    } catch (err) {
      return sendResponse(404, 'application/json', JSON.stringify({ error: "Dosya bulunamadı.", path: targetPath }));
    }
  }

  // 2. HATALI SAVUNMA (Naive Replace): Sadece tek sefer '../' siliyor
  // GET /api/flawed/read?file=....//system_secret.txt
  if (parsedUrl.pathname === '/api/flawed/read') {
    // HATA: Tek geçişli filtreleme (....// atlatır)
    const sanitized = requestedFile.replace(/\.\.\//g, '');
    const targetPath = path.join(PUBLIC_DIR, sanitized);

    try {
      const content = fs.readFileSync(targetPath, 'utf8');
      return sendResponse(200, 'text/plain', content);
    } catch (err) {
      return sendResponse(404, 'application/json', JSON.stringify({ error: "Dosya bulunamadı." }));
    }
  }

  // 3. SIKILAŞTIRILMIŞ UÇ NOKTA: Canonicalization + Symlink Resolution + Containment
  // GET /api/hardened/read?file=...
  if (parsedUrl.pathname === '/api/hardened/read') {
    if (!requestedFile) return sendResponse(400, 'application/json', JSON.stringify({ error: "file parametresi eksik." }));

    // Adım 1: path.resolve ile başlangıç hedef yolunu türet
    const candidatePath = path.resolve(PUBLIC_DIR, requestedFile);

    // Adım 2: Dosyanın fiziksel varlığını ve sembolik bağlarını çöz (Canonical Path)
    let realCandidatePath;
    try {
      // fs.realpathSync: Sembolik bağları izler, .. ifadelerini temizler, gerçek disk yolunu verir
      realCandidatePath = fs.realpathSync(candidatePath);
    } catch (err) {
      return sendResponse(404, 'application/json', JSON.stringify({ error: "Dosya bulunamadı veya erişilemez." }));
    }

    // Adım 3: Kök Dizin Sınır Doğrulaması (Safe Directory Containment)
    // Gerçek kök dizinin de symlink çözülmüş mutlak halini al
    const realRoot = fs.realpathSync(PUBLIC_DIR);

    // Güvenlik Kriteri: Hedef dosyanın gerçek yolu, izin verilen kök dizinle başlamalı ve sınır ayracı (path.sep) içermeli
    const isContained = realCandidatePath.startsWith(realRoot + path.sep) || realCandidatePath === realRoot;

    if (!isContained) {
      console.log(`[!] [GÜVENLİK ENGELİ] Dizin kaçışı tespit edildi: ${realCandidatePath}`);
      return sendResponse(403, 'application/json', JSON.stringify({ 
        error: "Erişim Reddedildi: Belirtilen dosya izin verilen kök dizinin dışındadır." 
      }));
    }

    // Adım 4: Güvenli Okuma (Dizin okumayı engelle, sadece normal dosya)
    const stat = fs.statSync(realCandidatePath);
    if (!stat.isFile()) {
      return sendResponse(400, 'application/json', JSON.stringify({ error: "Yalnızca normal dosyalar okunabilir." }));
    }

    const content = fs.readFileSync(realCandidatePath, 'utf8');
    return sendResponse(200, 'text/plain', content);
  }

  sendResponse(404, 'application/json', JSON.stringify({ error: "Not Found" }));
});

server.listen(4005, '127.0.0.1', () => {
  console.log('[+] Filesystem Security Lab Sunucusu 127.0.0.1:4005 üzerinde dinlemede.');
});
