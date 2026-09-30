# Vaka Analizi: Çok Kiracılı (Multi-Tenant) İzolasyon ve Nested Resource IDOR / BOLA

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** Uygulama URL hiyerarşisindeki `/tenants/:tId/projects/:pId` parametrelerinin oturum açan kullanıcıya ait olduğunu doğrulamış, ancak en derindeki `:dId` dokümanını veritabanından çekerken `SELECT * FROM documents WHERE id = :dId` çalıştırmıştır. Sonuç olarak Bob kendi projesinin yolu üzerinden Alice'in şirketine ait gizli doküman ID'sini ileterek veriyi sızdırmıştır.
- **Sıkılaştırılmış Durumda:** Veritabanı sorgusu **Scope Chaining** mantığıyla yazılmıştır: `JOIN projects p ON d.project_id = p.id WHERE d.id = ? AND p.id = ? AND p.tenant_id = ?`. Doküman o projeye ve o kiracıya bağlı değilse doğrudan `404 Not Found` dönmüştür.

## 2. Root Cause
**Trust Boundary Failure (Güven Sınırı İhlali).** Hiyerarşik URL yapılarında istemciden gelen parametrelerin birbirine bağlı olduğu varsayımı ve veritabanı sorgusunda nesne sahipliğinin (Ownership / Tenancy) tam zincirleme biçimde denetlenmemesi.

## 3. Dört Boyutlu Yetkilendirme Matrisi
1. **Horizontal (BOLA):** Aynı roldeki farklı kullanıcı veya organizasyonların birbirinin nesnesine erişimi.
2. **Vertical (BFLA):** Düşük yetkili rolün (`member`), yüksek yetkili metotları (`DELETE`, `PUT`) tetiklemesi.
3. **Context / Tenancy:** Kiracı bazlı veri yalıtımı.
4. **Nested Traversal:** `/orgs/A/projects/B/tasks/C` yollarında her bir bağlantının üst düğümle ilişkisinin doğrulanması.

## 4. Remediation (Mimari Çözüm)
1. **Scope Chaining:** Sorgularda her zaman en üst otorite kimliği (`tenant_id`) ile zincirleme JOIN kullan.
2. **Row-Level Security (RLS):** PostgreSQL gibi gelişmiş veritabanlarında `CREATE POLICY tenant_isolation_policy ON documents USING (tenant_id = current_setting('app.current_tenant'));` tanımlayarak uygulama kodundaki olası eksiklikleri veritabanı motorunda engelle.
3. **Function-Level RBAC Middleware:** Route katmanında HTTP metotları bazında rol kısıtlamalarını (`requireRole('admin')`) deklaratif olarak uygula.
