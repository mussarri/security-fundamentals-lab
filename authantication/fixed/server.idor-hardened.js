const http = require('http');
const url = require('url');

const USERS = {
  "token_user_101": { id: 101, name: "Ahmet", role: "customer" },
  "token_user_102": { id: 102, name: "Mehmet", role: "customer" },
  "token_admin_999": { id: 999, name: "Sistem Yoneticisi", role: "admin" }
};

const INVOICES = [
  { id: 1, userId: 101, amount: 250, description: "Ahmet - Sunucu Hizmeti" },
  { id: 2, userId: 102, amount: 9800, description: "Mehmet - Gizli Finansal Danışmanlık" }
];

function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return USERS[token] || null;
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const user = getAuthenticatedUser(req);

  if (parsedUrl.pathname.startsWith('/api/invoices/')) {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Kimlik doğrulaması başarısız." }));
    }

    const invoiceId = parseInt(parsedUrl.pathname.split('/').pop(), 10);
    const invoice = INVOICES.find(inv => inv.id === invoiceId);

    if (!invoice) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Fatura bulunamadı." }));
    }

    // NESNE SAHİPLİĞİ VE YETKİ KONTROLÜ (Object-Level Authorization)
    const isOwner = invoice.userId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log(`[!] ENGELLEME: Yetkisiz erişim! Kullanıcı: ${user.id} -> Hedef Fatura Sahibi: ${invoice.userId}`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Erişim reddedildi: Bu kaynağı görüntüleme yetkiniz yok." }));
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
}).listen(3007, () => {
  console.log('[+] Sıkılaştırılmış IDOR Korumalı API dinlemede: 3007');
});
