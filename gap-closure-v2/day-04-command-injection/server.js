const http = require('http');
const url = require('url');
const { exec, execFile } = require('child_process');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const host = parsedUrl.query.host || '';

  // Helper: JSON Yanıt
  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // 1. ZAFİYETLİ UÇ NOKTA: child_process.exec ile string birleştirme
  // GET /api/vulnerable/ping?host=127.0.0.1;id
  if (parsedUrl.pathname === '/api/vulnerable/ping') {
    if (!host) return sendJson(400, { error: "Host parametresi eksik." });

    // HATA: Girdi doğrudan kabuk komutuna string olarak ekleniyor!
    const cmd = `ping -c 1 ${host}`;
    console.log(`[!] Zafiyetli Kabuk Çalıştırılıyor: ${cmd}`);

    exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
      sendJson(200, {
        status: "EXECUTED",
        output: stdout || stderr,
        injected: stdout.includes('uid=') || stdout.includes('root')
      });
    });
    return;
  }

  // 2. HATALI SAVUNMA (Naive Blacklist): Sadece ';' ve '&' filtreleme
  // GET /api/flawed/ping?host=127.0.0.1|id
  if (parsedUrl.pathname === '/api/flawed/ping') {
    // HATA: Kara liste yetersizdir; pipe (|), backtick (`), $(), new line (\n) atlatır!
    if (host.includes(';') || host.includes('&')) {
      return sendJson(403, { error: "Yasaklı karakter tespit edildi." });
    }

    const cmd = `ping -c 1 ${host}`;
    exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
      sendJson(200, {
        status: "EXECUTED",
        output: stdout || stderr,
        injected: stdout.includes('uid=')
      });
    });
    return;
  }

  // 3. SIKILAŞTIRILMIŞ UÇ NOKTA: Argument Separation (execFile) + Strict Whitelist
  // GET /api/hardened/ping?host=...
  if (parsedUrl.pathname === '/api/hardened/ping') {
    // Adım 1: Katı Girdi Doğrulaması (Allowlist: Yalnızca IPv4 veya geçerli hostname)
    const hostnameRegex = /^[a-zA-Z0-9.-]+$/;
    if (!hostnameRegex.test(host)) {
      return sendJson(400, { 
        error: "Geçersiz host formatı. Yalnızca alfanümerik, tire ve nokta karakterlerine izin verilir." 
      });
    }

    // Adım 2: Mimari Ayrım (execve syscall) - Kabuk başlatılmaz!
    // /bin/ping programına argümanlar bağımsız dizi olarak verilir.
    execFile('/bin/ping', ['-c', '1', host], { timeout: 3000 }, (error, stdout, stderr) => {
      if (error && error.killed) {
        return sendJson(408, { error: "Ping zaman aşımına uğradı." });
      }
      sendJson(200, {
        status: "SUCCESS",
        output: stdout
      });
    });
    return;
  }

  sendJson(404, { error: "Not Found" });
});

server.listen(4004, '127.0.0.1', () => {
  console.log('[+] Command Injection Lab Sunucusu 127.0.0.1:4004 üzerinde hazır.');
});
