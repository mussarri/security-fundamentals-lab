# Mühendislik Analizi — Lab 04: Header Splitting & Delimiter Inconsistencies

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli uygulama, yalnızca geleneksel `\r\n` (CRLF) kombinasyonunu arayan dar bir kara liste kontrolü işletti. Ancak pek çok ağ bileşeni ve istemci (özellikle geriye dönük uyumluluk veya esneklik modundaki ayrıştırıcılar), tekil `\n` (Bare LF) veya `\r` (Bare CR) karakterini de geçerli bir satır sonu sınırlayıcısı (*line delimiter*) kabul eder. Saldırgan `\nInjected-Header:...` gönderdiğinde filtre bunu düz metin sanarak geçirdi, fakat soket çıktısında yeni bir HTTP başlığı oluşturuldu.
* **Neden Engellendi:** Sıkılaştırılmış kodda:
  1. `\r`, `\n`, `\0` gibi tüm kontrol karakterleri tekil olarak denetlendi ve varlıkları doğrudan `400 Bad Request` sebebi sayıldı.
  2. Başlık değerleri için katı bir regex allowlist (`^[a-zA-Z0-9_\-]+$`) zorunlu tutularak beklenmeyen ayrıştırıcı sembollerinin tamamı engellendi.

## 2. Root Cause
* **Interpretation Differentials:** Standartların (RFC 7230/9112) gerektirdiği katı CRLF kuralı ile uygulamaların/istemcilerin sergilediği toleranslı bare LF ayrıştırması arasındaki fark.
* **Code / Data Separation Failures:** Kullanıcı girdisinin protokole ait kontrol karakterlerinden arındırılmadan doğrudan protokol başlık akışına (header stream) enjekte edilmesi.

## 3. Platform Davranışları
* **Tolerant Parsers (Node.js eski sürümleri, eski Apache/Nginx):** Ağdaki bozuk istemcileri tolere etmek adına bare `\n` ile başlık ayrıştırmaya izin verebilir; bu durum HTTP Desync ve Response Splitting açıklarına yol açar.
* **Modern HTTP Kütüphaneleri:** Werkzeug, Express, Go net/http gibi modern kütüphaneler başlık değerlerine yazılan `\r` veya `\n` karakterlerinde çalışma zamanı hatası fırlatarak geliştiriciyi korur. Ancak ham soket veya düşük seviyeli proxy kodlarında bu koruma geliştiriciye kalır.

## 4. Kalıcı Savunma (Remediation)
1. **Never Concatenate into Raw Headers:** HTTP başlıklarını doğrudan dize birleştirme (`f"Header: {val}"`) ile oluşturmayın; framework'ün güvenli başlık API'lerini kullanın.
2. **Strict Character Validation:** Başlık değerlerine gidecek kullanıcı girdilerini kontrol karakterlerine karşı denetleyin (`\r`, `\n`, `\0` kesinlikle yasaklanmalıdır).
3. **HTTP/2 ve HTTP/3 Kullanımı:** İkili (binary) protokollerde başlıklar anahtar-değer ikilisi olarak çerçevelendiğinden (FRAMING), CRLF injection tabiatı gereği yapısal olarak imkansız hale gelir.

## 5. Doğrulama
`tests/test-suite.sh` betiği ile bare LF (`\n`) enjeksiyonunun zafiyetli sunucuda başarılı bir şekilde yeni başlık açtığı, sıkılaştırılmış sunucuda ise `CRLF_INJECTION_DETECTED` hatasıyla kesildiği kanıtlanmıştır.

## 6. Varyant Analizi
* **HTTP Response Splitting $\rightarrow$ Cache Poisoning:** İki ardışık satır sonu ile sahte bir HTTP yanıtı üretilerek ara önbelleğin (CDN/Proxy) zehirlenmesi.
* **SMTP Header Injection:** Benzer şekilde e-posta gönderim formlarında `\nBcc: victim@domain.com` enjeksiyonu ile spam dağıtımı.

Lab,Ele Alınan Kriz,Kök Neden,Mühendislik Çözümü
Lab 01,JSON Duplicate Keys,RFC 8259 gevşekliği; Validator (first-key) vs. Consumer (last-key) kopması.,object_pairs_hook ile yinelenen anahtarları anında reddetme.
Lab 02,Normalization Order,Filter-Before-Decode; verinin kontrolden geçip sonradan açılması.,Decode-Before-Filter ve parametrik veri/kod ayrımı.
Lab 03,URL Parser Duality,RFC 3986 (urllib) ile WHATWG (Node/Browser) ayrışması (\ karakteri).,"Parser belirsizliği yaratan karakterleri sınırda reddetme (\, null-byte)."
Lab 04,Header Splitting,CRLF yerine Bare LF (\n) toleransı ve zayıf kara liste filtresi.,Kontrol karakteri izolasyonu ve katı başlık allowlist'i.