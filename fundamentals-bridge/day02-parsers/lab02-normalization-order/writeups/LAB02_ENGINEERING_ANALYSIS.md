# Mühendislik Analizi — Lab 02: Normalization Order (Filter-Before-Decode vs. Decode-Before-Filter)

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli kodda güvenlik filtresi (WAF benzetimi) `request.args.get()` ile alınan ham dize üzerinde çalıştırıldı. Saldırgan SQL karakterlerini (`'`, boşluk, `--`) URL encode ederek (`%27`, `%20`) ilettiğinde, filtre tırnak veya tehlikeli anahtar kelimeleri göremediği için isteği onayladı. Filtreden hemen sonra gelen `urllib.parse.unquote()` satırı girdiyi çözünce, tehlikeli karakterler doğrudan SQL sorgu dizesine enjekte oldu.
* **Neden Engellendi:** Sıkılaştırılmış kodda sıra tersine çevrildi:
  1. Girdi önce `unquote()` ile kanonik haline getirildi.
  2. Doğrulama (regex allowlist) decode edilmiş nihai veri üzerinde koşturuldu.
  3. Kod / Veri ayrımı (Code/Data Separation) için parametrik sorgu (`?`) kullanıldı.

## 2. Root Cause
* **Interpretation Differentials:** Doğrulama filtresinin "bu girdi güvenli bir metin" dediği an ile veritabanı motorunun girdiyi yorumladığı an arasındaki kod çözme (decoding) faz farkı.
* **Order of Operations Failure:** Normalizasyon ve decode işleminin, doğrulama kontrollerinden SONRA çağrılması.

## 3. Platform Davranışları
* **Web Sunucusu ve Framework Ayrışması:** Bazı framework'ler (ör. Express, Flask) query parametrelerini otomatik decode ederken, raw stream veya path parametrelerinde farklı decode stratejileri izleyebilir.
* **Custom Middleware:** Geliştiricilerin "güvenlik katmanı" olarak en başa koyduğu regex filtreleri, framework'ün iç routing veya model parsing aşamasından önce çalıştığında kaçınılmaz olarak filter-before-decode hatasına düşer.

## 4. Kalıcı Savunma (Remediation)
1. **Canonicalize Before Validate:** Girdi sistem sınırında önce en sade, tekil ve nihai haline indirgenmeli; tüm denetimler bu nihai veri üzerinde yapılmalıdır.
2. **Never Rely on Blacklists:** Karakter veya anahtar kelime kara listeleri yerine, kesin karakter kümesi tanımlayan Allowlist'ler kullanılmalıdır.
3. **Parameterized Interfaces:** Girdi normalize edilmiş olsa bile asla dinamik dize birleştirme ile SQL, shell veya template motoruna verilmemelidir.

## 5. Doğrulama
`tests/test-suite.sh` betiği üzerinden hem URL-encoded SQL payload'unun zafiyetli sunucuda veri sızdırdığı hem de sıkılaştırılmış uç noktada 400 Bad Request ile durdurulduğu otomatik test edilmiştir.

## 6. Varyant Analizi
* **Command Injection Evasion:** Linux shell komutları için `$IFS`, `${IFS}` veya hex gösterimlerin WAF filtreleri geçtikten sonra script içinde eval/sh ile çözülmesi.
* **XSS in Double Escaped Contexts:** Markdown motorunun veya template motorunun filtre sonrası unescape yapmasıyla tetiklenen XSS atakları.
