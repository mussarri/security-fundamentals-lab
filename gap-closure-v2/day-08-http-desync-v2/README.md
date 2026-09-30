# DAY 8: HTTP Desync Lab v2 (Independent Victim & Boundary Assertions)

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** Ön yüz proxy'si `Content-Length: 50` başlığını dikkate alarak gelen tüm baytları arka yüze giden paylaşımlı TCP soketine aktarmıştır. Arka yüz ise `Transfer-Encoding: chunked` önceliğine sahip olduğu için `0\r\n\r\n`'yi gördüğü anda ilk isteği tamamlamış; gövdede kalan `POST /admin/unauthorized-action...` satırını soket tamponunda bırakmıştır. Ardından gelen bağımsız kurbanın `GET /user/profile` isteği bu önekin ardına yapışmış ve kurbanın isteği yetkisiz bir yönetici eylemine dönüştürülmüştür.
- **Sıkılaştırılmış Durumda:** Ön yüz RFC 7230 / RFC 9112 standardını tavizsiz uygulamış; hem `Content-Length` hem de `Transfer-Encoding` içeren belirsiz istekleri anında `400 Bad Request` ile reddetmiş ve TCP bağlantısını kapatmıştır (`Connection: close`).

## 2. Root Cause
**Interpretation Differential (Yorumlama Farklılığı).** İki ayrı ağ bileşeninin (Proxy ve Backend), aynı TCP akışı içindeki HTTP mesaj sınırlarını (`message boundary`) farklı başlık kurallarıyla ayrıştırması ve bağlantı havuzu (Keep-Alive pooling) nedeniyle oturumların birbirine sızması.

## 3. Boundary Assertion Mantığı
Bir HTTP Desync saldırısının başarılı sayılması için:
$$\text{Response}(\text{Victim Request}) == \text{Response}(\text{Smuggled Prefix} + \text{Victim Request})$$
şartının gerçekleştiği ve kurbanın kendi istediği veriyi değil, saldırganın enjekte ettiği eylemin sonucunu aldığı (`ADMIN_ATTACK_INTERCEPTED!`) doğrulanmalıdır.

## 4. Remediation (Kalıcı Savunma)
1. **End-to-End HTTP/2:** Ön yüzden arka yüze kadar uçtan uca HTTP/2 ikili çerçeveleme (binary framing) kullanarak metin tabanlı sınır karmaşasını tamamen ortadan kaldır.
2. **Ambiguous Header Rejection:** Hem CL hem TE taşıyan istekleri normalize etmeye çalışmadan `400` ile sonlandır.
3. **Connection Isolation:** Kullanıcı oturumları arasında arka yüz TCP soketlerini ortak havuzda (pooling) paylaştırma.

## 5. Doğrulama
```bash
./gap-closure-v2/day-08-http-desync-v2/test-suite.sh
```