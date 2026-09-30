const http = require('http');
const url = require('url');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');

// Çok Kiracılı İlişkisel Şema
db.exec(`
  CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT NOT NULL -- 'admin' veya 'member'
  );

  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  );

  -- TEST VERİLERİ:
  -- Tenant A: Alpha Corp
  INSERT INTO tenants VALUES ('tenant-a', 'Alpha Corp');
  INSERT INTO users VALUES ('usr-alice', 'tenant-a', 'alice', 'admin');
  INSERT INTO projects VALUES ('proj-a1', 'tenant-a', 'Alpha Finans');
  INSERT INTO documents VALUES ('doc-alpha-secret', 'proj-a1', '2026 Bütçe Raporu', 'Kritik Finansal Veriler (Gizli)');

  -- Tenant B: Beta Ltd
  INSERT INTO tenants VALUES ('tenant-b', 'Beta Ltd');
  INSERT INTO users VALUES ('usr-bob', 'tenant-b', 'bob', 'member');
  INSERT INTO projects VALUES ('proj-b1', 'tenant-b', 'Beta Pazarlama');
  INSERT INTO documents VALUES ('doc-beta-public', 'proj-b1', 'Halka Açık Duyuru', 'Pazarlama Metni');
`);

console.log('[+] Multi-Tenant veritabanı hazırlandı.');

// Basit Token/Kimlik Çözücü Simülasyonu
function authenticate(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.includes('alice-token')) return { id: 'usr-alice', tenant_id: 'tenant-a', role: 'admin' };
  if (authHeader.includes('bob-token')) return { id: 'usr-bob', tenant_id: 'tenant-b', role: 'member' };
  return null;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const user = authenticate(req);

  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: "Kimlik doğrulama başarısız." }));
  }

  // 1. ZAFİYETLİ UÇ NOKTA: Nested Resource BOLA / Multi-Tenant Bypass
  // GET /api/vulnerable/tenants/:tId/projects/:pId/documents/:dId
  const vulnMatch = path.match(/^\/api\/vulnerable\/tenants\/([^\/]+)\/projects\/([^\/]+)\/documents\/([^\/]+)$/);
  if (vulnMatch && req.method === 'GET') {
    const [, tId, pId, dId] = vulnMatch;

    // HATA: Sadece tenant_id kullanıcınınkiyle uyuşuyor mu diye bakılır,
    // ancak SQL sorgusunda document doğrudan ID ile çekilir!
    if (user.tenant_id !== tId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Bu kiracıya ait değilsiniz." }));
    }

    // ZAFİYETLİ SORGU: Dokümanın bu projeye ve bu kiracıya ait olduğu doğrulanmıyor!
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    const doc = stmt.get(dId);

    if (doc) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: "SUCCESS", doc }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Doküman bulunamadı." }));
    }
  }

  // 2. SIKILAŞTIRILMIŞ UÇ NOKTA: Katı Scope Chaining + Dikey Rol (RBAC) Denetimi
  // GET /api/hardened/tenants/:tId/projects/:pId/documents/:dId
  // DELETE /api/hardened/tenants/:tId/projects/:pId/documents/:dId
  const hardMatch = path.match(/^\/api\/hardened\/tenants\/([^\/]+)\/projects\/([^\/]+)\/documents\/([^\/]+)$/); // bu regex, tenant_id, project_id ve document_id'yi yakalar
  if (hardMatch) {
    const [, tId, pId, dId] = hardMatch;

    // A. Tenant Güvenlik Duvarı
    if (user.tenant_id !== tId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Erişim Reddedildi: Kiracı sınırı ihlali." }));
    }

    // B. Dikey Yetkilendirme (BFLA Koruması: Sadece 'admin' silebilir)
    if (req.method === 'DELETE' && user.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Yetkisiz İşlem: Yalnızca admin rolü silebilir." }));
    }

    // C. Mimari Çözüm: Scope Chaining JOIN Sorgusu
    // Doküman -> Proje -> Kiracı zinciri veritabanı motoru düzeyinde zorunlu kılınır!
    const query = `
      SELECT d.* FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = ? 
        AND p.id = ? 
        AND p.tenant_id = ?;
    `;
    const stmt = db.prepare(query);
    const doc = stmt.get(dId, pId, user.tenant_id);

    if (!doc) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Doküman bu proje ve kiracı altında mevcut değil." }));
    }

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: "SUCCESS", doc }));
    }

    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM documents WHERE id = ?').run(dId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: "DELETED", id: dId }));
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(3021, '127.0.0.1', () => {
  console.log('[+] Multi-Tenant & RBAC Sunucusu 127.0.0.1:3021 üzerinde hazır.');
});
