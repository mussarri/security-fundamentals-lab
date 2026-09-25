const http = require('http');
const url = require('url');

// Bellek İçi Sahte Veritabanı
const USERS = {
  "token_user_101": { id: 101, name: "Ahmet", role: "customer" },
  "token_user_102": { id: 102, name: "Mehmet", role: "customer" }
};

const INVOICES = [
  { id: 1, userId: 101, amount: 250, description: "Ahmet - Sunucu Hizmeti" },
  { id: 2, userId: 102, amount: 9800, description: "Mehmet - Gizli Finansal Danışmanlık" }
];

// Kimlik Doğrulama Middleware Benzetimi (Token -> Kullanıcı)
function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return USERS[token] || null;
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const user = getAuthenticatedUser(req);

  // 1. ZAFİYETLİ ENDPOINT: IDOR (Yalnızca nesne ID'sine bakar, sahiplik denetlemez)
  // GET /api/vulnerable/invoices/:id
  if (parsedUrl.pathname.startsWith('/api/vulnerable/invoices/')) {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Giriş yapmalısınız." }));
    }

    const invoiceId = parseInt(parsedUrl.pathname.split('/').pop(), 10);
    const invoice = INVOICES.find(inv => inv.id === invoiceId);

    if (!invoice) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Fatura bulunamadı." }));
    }

    // KRİTİK HATA: Faturanın gerçekten bu kullanıcıya ait olup olmadığı kontrol EDİLMİYOR!
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: "SUCCESS",
      accessedBy: user.name,
      invoice: invoice
    }));
  }

  // 2. SIKILAŞTIRILMIŞ ENDPOINT: Object-Level Authorization Koruması
  // GET /api/hardened/invoices/:id
  if (parsedUrl.pathname.startsWith('/api/hardened/invoices/')) {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Giriş yapmalısınız." }));
    }

    const invoiceId = parseInt(parsedUrl.pathname.split('/').pop(), 10);
    const invoice = INVOICES.find(inv => inv.id === invoiceId);

    if (!invoice) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Fatura bulunamadı." }));
    }

    // GÜVENLİK KONTROLÜ: Nesne Sahipliği Denetimi (Ownership Verification)
    if (invoice.userId !== user.id && user.role !== 'admin') {
      console.log(`[!] ENGELLEME: IDOR denemesi! Kullanıcı ${user.id}, Fatura Sahibi: ${invoice.userId}`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Erişim reddedildi: Bu kaynağa erişim yetkiniz yok!" }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: "SUCCESS",
      accessedBy: user.name,
      invoice: invoice
    }));
  }

  res.writeHead(404);
  res.end('Not Found');
}).listen(3006, () => {
  console.log('[+] IDOR/BOLA Laboratuvar Sunucusu çalışıyor: http://localhost:3006');
});
