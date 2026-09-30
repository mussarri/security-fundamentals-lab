const http = require('http');
const url = require('url');
const crypto = require('crypto');

// 1. VERİ DEPOSU (In-Memory State)
// Parola hashleme yardımcısı: scrypt (CPU/Memory Cost)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, originalHash] = stored.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

const users = {
  alice: {
    id: 'usr_alice_1',
    passwordHash: hashPassword('CorrectPassword123!'),
    resetToken: null,
    resetTokenExpiry: null
  }
};

// Aktif Stateful Oturumlar
// sessionId -> { userId, createdAt, lastActivityAt }
const sessions = new Map();

// Refresh Token Ailesi (Reuse Detection için)
// familyId -> { activeToken, userId, isRevoked }
const tokenFamilies = new Map();
// token -> { familyId, used }
const refreshTokens = new Map();

const IDLE_TIMEOUT_MS = 3000;      // Test için 3 saniye hareketsizlik
const ABSOLUTE_TIMEOUT_MS = 8000;  // Test için 8 saniye mutlak oturum ömrü

// 2. HTTP API SUNUCUSU
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const cookie = req.headers['cookie'] || '';

  const getSessionId = () => {
    const match = cookie.match(/sid=([a-f0-9]+)/);
    return match ? match[1] : null;
  };

  // Helper: JSON Yanıt
  const sendJson = (status, data, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(data));
  };

  // Helper: Request Body
  const parseBody = (cb) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        cb(JSON.parse(body || '{}'));
      } catch (e) {
        cb({});
      }
    });
  };

  // ROUTE 1: Login & Session ID Rotation (Fixation Defense)
  if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
    parseBody(({ username, password }) => {
      const user = users[username];
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendJson(401, { error: "Geçersiz kimlik bilgileri." });
      }

      // Fixation Koruması: Eski oturum varsa sil, yepyeni ID üret
      const oldSid = getSessionId();
      if (oldSid && sessions.has(oldSid)) {
        sessions.delete(oldSid);
      }

      const newSid = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      sessions.set(newSid, {
        userId: user.id,
        createdAt: now,
        lastActivityAt: now
      });

      // İlk Refresh Token ve Family oluştur
      const familyId = crypto.randomBytes(16).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      tokenFamilies.set(familyId, { activeToken: refreshToken, userId: user.id, isRevoked: false });
      refreshTokens.set(refreshToken, { familyId, used: false });

      sendJson(200, {
        status: "AUTHENTICATED",
        refreshToken,
        familyId
      }, {
        'Set-Cookie': `sid=${newSid}; Path=/; HttpOnly; SameSite=Strict`
      });
    });
    return;
  }

  // ROUTE 2: Korumalı Dashboard (Idle & Absolute Expiry Kontrolü)
  if (parsedUrl.pathname === '/api/dashboard' && req.method === 'GET') {
    const sid = getSessionId();
    if (!sid || !sessions.has(sid)) {
      return sendJson(401, { error: "Oturum bulunamadı." });
    }

    const session = sessions.get(sid);
    const now = Date.now();

    // Kontrol A: Idle Expiry
    if (now - session.lastActivityAt > IDLE_TIMEOUT_MS) {
      sessions.delete(sid);
      return sendJson(401, { error: "Oturum hareketsizlik nedeniyle zaman aşımına uğradı (Idle Timeout)." });
    }

    // Kontrol B: Absolute Expiry
    if (now - session.createdAt > ABSOLUTE_TIMEOUT_MS) {
      sessions.delete(sid);
      return sendJson(401, { error: "Maksimum oturum süresi doldu (Absolute Timeout)." });
    }

    // Hareket zamanını güncelle
    session.lastActivityAt = now;
    return sendJson(200, { status: "SUCCESS", secret: "Çok Gizli Kullanıcı Verisi" });
  }

  // ROUTE 3: Logout (Sunucu Tarafı Invalidation)
  if (parsedUrl.pathname === '/api/logout' && req.method === 'POST') {
    const sid = getSessionId();
    if (sid) sessions.delete(sid);

    sendJson(200, { status: "LOGGED_OUT" }, {
      'Set-Cookie': 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    });
    return;
  }

  // ROUTE 4: Password Change (Mevcut Parola Doğrulamalı)
  if (parsedUrl.pathname === '/api/change-password' && req.method === 'POST') {
    const sid = getSessionId();
    if (!sid || !sessions.has(sid)) return sendJson(401, { error: "Yetkisiz işlem." });

    parseBody(({ oldPassword, newPassword }) => {
      const session = sessions.get(sid);
      const user = Object.values(users).find(u => u.id === session.userId);

      if (!verifyPassword(oldPassword, user.passwordHash)) {
        return sendJson(403, { error: "Mevcut parola hatalı." });
      }

      user.passwordHash = hashPassword(newPassword);
      // Şifre değiştiğinde tüm aktif oturumları iptal et (Session Invalidation)
      for (const [sKey, sVal] of sessions.entries()) {
        if (sVal.userId === user.id) sessions.delete(sKey);
      }

      sendJson(200, { message: "Parola güncellendi. Tüm cihazlardaki oturumlar kapatıldı." });
    });
    return;
  }

  // ROUTE 5: Refresh Token Rotation & Reuse Detection
  // POST /api/token/refresh
  if (parsedUrl.pathname === '/api/token/refresh' && req.method === 'POST') {
    parseBody(({ refreshToken }) => {
      if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return sendJson(401, { error: "Geçersiz Refresh Token." });
      }

      const tokenMeta = refreshTokens.get(refreshToken);
      const family = tokenFamilies.get(tokenMeta.familyId);

      // KRİTİK: REUSE DETECTION (Çalınma Tespiti)
      // Daha önce kullanılmış bir token ile tekrar gelinmişse bu token çalınmıştır!
      if (tokenMeta.used || family.isRevoked) {
        console.log(`[!] [GÜVENLİK ALARMI] Refresh Token Reuse tespit edildi! Aile: ${tokenMeta.familyId}`);
        family.isRevoked = true; // Tüm aileyi geçersiz kıl

        // Bu kullanıcıya ait aktif stateful oturumları da güvenlik için düşür
        for (const [sKey, sVal] of sessions.entries()) {
          if (sVal.userId === family.userId) sessions.delete(sKey);
        }

        return sendJson(403, {
          error: "Güvenlik İhlali: Kullanılmış Refresh Token tekrar kullanıldı. Tüm oturumlar iptal edildi!"
        });
      }

      // Meşru Kullanım: Eski token'ı kullanıldı işaretle (Rotation)
      tokenMeta.used = true;

      // Yeni Token Çifti Üret
      const newRefreshToken = crypto.randomBytes(32).toString('hex');
      const newAccessToken = crypto.randomBytes(16).toString('hex');

      family.activeToken = newRefreshToken;
      refreshTokens.set(newRefreshToken, { familyId: tokenMeta.familyId, used: false });

      sendJson(200, {
        status: "ROTATED",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    });
    return;
  }

  sendJson(404, { error: "Not Found" });
});

server.listen(4003, '127.0.0.1', () => {
  console.log('[+] Auth Lifecycle Lab Sunucusu 127.0.0.1:4003 üzerinde dinlemede.');
});
