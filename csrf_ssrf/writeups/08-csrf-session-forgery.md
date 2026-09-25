# Vaka Analizi: CSRF (Cross-Site Request Forgery) ve Çift Katmanlı Savunma

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** Kurban saldırgan sitesini ziyaret ettiğinde, tarayıcı gizli formu hedef sunucuya POST ederken kurbana ait oturum çerezlerini isteğe otomatik iliştirmiştir. Sunucu kullanıcının niyetini doğrulamadığı için işlem başarıyla icra edilmiştir.
- **Sıkılaştırılmış Durumda:** `SameSite=Strict` bayrağı tarayıcının üçüncü taraf isteklerde çerezi göndermesini engellemiş; ek olarak `Anti-CSRF Token` doğrulaması sayesinde saldırganın bilmediği gizli token kontrolü yapılarak saldırı 403 ile reddedilmiştir.

## 2. Root Cause
Ambient Authority (Ortam Yetkisi) prensibinin getirdiği güvenlik açığı: Sunucunun gelen HTTP çerezini sorgusuz sualsiz kullanıcının güncel iradesi olarak kabul etmesi.

## 3. Platform / Tarayıcı Kontrolleri
- RFC 6265bis spesifikasyonu uyarınca modern tarayıcılarda varsayılan davranış `SameSite=Lax` yönündedir; ancak açıkça `SameSite=Strict` veya `SameSite=Lax` belirtmek şarttır.

## 4. Remediation (Düzeltme)
1. **SameSite Bayrağı:** Tüm oturum çerezlerinde `SameSite=Lax` veya `SameSite=Strict` tanımla.
2. **Synchronizer Token Pattern:** Durum değiştiren (`POST`, `PUT`, `DELETE`) tüm form ve isteklerde tek kullanımlık veya oturuma bağlı gizli `X-CSRF-Token` başlığı/girdisi talep et.
3. **Custom Headers:** Modern REST API'lerde isteklerin `Content-Type: application/json` ve `X-Requested-With: XMLHttpRequest` başlıklarıyla gelmesini zorunlu tut (HTML formları bu başlıkları atamaz, preflight devreye girer).

## 5. Doğrulama
Anti-CSRF token olmadan atılan POST isteklerinin 403 aldığını doğrula.

## 6. Variant Analysis
- JSON CSRF: Eski Flash eklentileri veya CORS yapılandırma hataları üzerinden tetiklenen JSON formatlı CSRF atakları.
- Login CSRF: Saldırganın kurbanı kendi açtığı hesaba gizlice login ettirip kurbanın aramalarını ve aktivitelerini izlemesi.
