const http = require('http');
const url = require('url');
const crypto = require('crypto');

// 1. BELLEK İÇİ OTURUM VE KULLANICI DEPOSU
// user_id -> { passwordHash, isActive, sessionVersion }
const users = {
  'usr_admin': {
    username: 'admin',
    isActive: true,
    sessionVersion: 1 // Şifre değişiminde artırılır (Global Invalidation)
  }
};

// session_id -> { userId, version, createdAt }
const sessions = new Map();

// 2. JWT SABİTLERİ (Katı Claims Doğrulaması için)
const JWT_SECRET = 'SUPER_SECRET_HMAC_KEY_2026';
const EXPECTED_ISSUER = 'https://auth.example.com';
const EXPECTED_AUDIENCE = 'api://billing-service';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h64 = base64UrlEncode(JSON.stringify(header));
  const p64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${h64}.${p64}`).digest('base64url');
  return `${h64}.${p64}.${signature}`;
}

function verifyJwtStrict(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Geçersiz JWT formatı');

  const [h64, p64, s64] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${h64}.${p64}`).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(s64), Buffer.from(expectedSig))) {
    throw new Error('İmza geçersiz!');
  }

  const payload = JSON.parse(base64UrlDecode(p64));
  const now = Math.floor(Date.now() / 1000);

  // KATI CLAIMS KONTROLLERİ:
  if (payload.iss !== EXPECTED_ISSUER) {
    throw new Error(`Issuer mismatch: ${payload.iss} !== ${EXPECTED_ISSUER}`);
  }
  if (payload.aud !== EXPECTED_AUDIENCE) {
    throw new Error(`Audience mismatch: ${payload.aud} !== ${EXPECTED_AUDIENCE}`);
  }
  if (!payload.exp || now > payload.exp) {
    throw new Error('Token süresi dolmuş (exp expired)');
  }
  if (payload.nbf && now < payload.nbf) {
    throw new Error('Token henüz aktif değil (nbf in future)');
  }

  return payload;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // A. LOGIN: Yeni Oturum Oluşturma & Fixation Koruması
  if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
    const sessionId = crypto.randomBytes(24).toString('hex');
    sessions.set(sessionId, {
      userId: 'usr_admin',
      version: users['usr_admin'].sessionVersion,
      createdAt: Date.now()
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `sid=${sessionId}; Path=/; HttpOnly; SameSite=Lax`
    });
    return res.end(JSON.stringify({ status: "SUCCESS", sessionId }));
  }

  // B. ŞİFRE DEĞİŞTİRME: Küresel Oturum İptali (Revoke All Sessions)
  if (parsedUrl.pathname === '/api/change-password' && req.method === 'POST') {
    // Kullanıcının sessionVersion değerini artır
    users['usr_admin'].sessionVersion += 1;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      message: "Şifre değiştirildi. Tüm eski cihazlardaki oturumlar iptal edildi.",
      newVersion: users['usr_admin'].sessionVersion
    }));
  }

  // C. KORUMALI VERİ (Stateful Session Kontrolü)
  if (parsedUrl.pathname === '/api/dashboard') {
    const cookie = req.headers['cookie'] || '';
    const match = cookie.match(/sid=([a-f0-9]+)/);
    const sid = match ? match[1] : null;

    if (!sid || !sessions.has(sid)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Geçersiz veya sonlandırılmış oturum." }));
    }

    const session = sessions.get(sid);
    const user = users[session.userId];

    // Oturum versiyonu güncel mi? (Şifre değiştiyse eski oturum reddedilmeli)
    if (!user.isActive || session.version !== user.sessionVersion) {
      sessions.delete(sid); // Sunucu belleğinden de temizle
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Oturum iptal edilmiş (Şifre değişimi veya hesap pasif)." }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: "OK", data: "Gizli Yönetim Paneli" }));
  }

  // D. KORUMALI FATURALAMA API'Sİ (JWT Claims Doğrulaması)
  // GET /api/billing (Authorization: Bearer <token>)
  if (parsedUrl.pathname === '/api/billing') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    try {
      const payload = verifyJwtStrict(token);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: "AUTHORIZED",
        subject: payload.sub,
        billing_record: "$45,000 Ödeme Emri"
      }));
    } catch (err) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `JWT Yetki Reddi: ${err.message}` }));
    }
  }

  // E. TEST HELPER: Geçerli ve Hatalı Token Üretici
  if (parsedUrl.pathname === '/api/generate-tokens') {
    const now = Math.floor(Date.now() / 1000);
    
    const validToken = signJwt({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      sub: 'usr_admin',
      exp: now + 3600
    });

    const wrongAudienceToken = signJwt({
      iss: EXPECTED_ISSUER,
      aud: 'api://mobile-app', // Yanlış audience
      sub: 'usr_admin',
      exp: now + 3600
    });

    const expiredToken = signJwt({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      sub: 'usr_admin',
      exp: now - 60 // 1 dakika önce süresi dolmuş
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ validToken, wrongAudienceToken, expiredToken }));
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(3020, '127.0.0.1', () => {
  console.log('[+] Session & JWT Lifecycle Sunucusu 127.0.0.1:3020 üzerinde dinlemede.');
});
