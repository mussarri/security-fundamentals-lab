# Mühendislik Analizi — Lab 03: Contextual Encoding & Browser Execution Order

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli filtre, girdiyi düz metin düzeyinde (`startswith("javascript:")`) denetledi. Saldırgan `j` karakteri yerine `&#x6a;` HTML entity'si koyduğunda filtre "bu güvenli bir metin" diyerek geçirdi. Ancak çıktı tarayıcıya ulaştığında, tarayıcının DOM parser'ı `href` niteliğindeki attribute değerini okurken önce HTML Entity decode adımını işletti. Dize `javascript:alert(1)` formuna kavuştu. Kullanıcı linke tıkladığında veya autofocus mekanizması devreye girdiğinde URL parser protokolün JS olduğunu onaylayıp JS Engine'e devretti ve XSS gerçekleşti.
* **Neden Engellendi:** Sıkılaştırılmış kod, tarayıcının çalışma modelini birebir taklit etti:
  1. Önce `html.unescape()` ile HTML entity katmanını çözdü (Kanonikleştirme).
  2. `urllib.parse.urlparse` ile şema kontrolü yaptı ve sadece `http` / `https` protokollerine izin veren katı bir **Allowlist** uyguladı (`javascript:`, `vbscript:`, `data:` tamamen elendi).
  3. Çıktıyı HTML attribute içine yerleştirmeden önce bağlama uygun şekilde yeniden HTML-escape etti.

## 2. Root Cause
* **Interpretation Differentials:** Sunucu tarafındaki filtre kütüphanesinin girdiyi "düz metin" olarak yorumlaması ile tarayıcının girdiyi "HTML attribute içinde yürütülebilir bir URI referansı" olarak yorumlaması arasındaki mantıksal uyumsuzluk.
* **Missing Multi-layer Canonicalization:** Denetim yapılmadan önce girdinin ait olduğu bağlamın (HTML Entity) çözülmemesi.

## 3. Platform Davranışları
* **Tarayıcı Yürütme Sırası (RFC / WHATWG):**
  1. HTML Parsing: HTML attribute sınırları (`"..."` veya `'...'`) içinde kalan her türlü sayısal (`&#...;`) ve isimlendirilmiş (`&colon;`) entity çözülür.
  2. URL Parsing: Çözülen metin bir URI ise RFC 3986'ya göre scheme tespiti yapılır.
  3. Script Yürütme: Scheme `javascript:` ise kalan URI parçası string olarak JavaScript motoruna gönderilir.
* **WAF Yetersizliği:** Statik regex tabanlı WAF'lar HTML/URL decode hiyerarşisini simüle etmedikçe `&#x6a;` varyasyonlarını yakalayamaz.

## 4. Kalıcı Savunma (Remediation)
1. **Şema Allowlist'i (En Kritik Adım):** Kullanıcı kontrollü URL alanlarında (`href`, `src`, `action`) asla blacklist kullanmayın. Sadece `['http', 'https']` şemalarını allowlist ile kabul edin.
2. **Context-Aware Encoding:**
   - HTML Gövdesi (Body): HTML Entity encode (`<` -> `&lt;`, `>` -> `&gt;`).
   - HTML Niteliği (Attribute): Tırnaklar ve entity'ler encode edilir (`"` -> `&quot;`).
   - JavaScript Context: Unicode escape (`\u0022`) veya JSON serialization.
3. **Önce Unescape, Sonra Validate:** URL doğrulamadan önce potansiyel entity'leri temizleyin, şemayı doğrulayın, ardından render ederken tekrar bağlama uygun escape uygulayın.

## 5. Doğrulama
`tests/test-suite.sh` betiği üzerinden hem zafiyetli sunucunun entity bypass'a izin verdiği hem de sıkılaştırılmış uç noktanın geçersiz şemayı (`#invalid-scheme`) başarıyla yakalayıp meşru URL'yi hatasız formatladığı kanıtlanmıştır.

## 6. Varyant Analizi
* **Mixed Context XSS (JS içinde HTML Entity):** `<button onclick="track('{{ user_input }}')">` durumunda: Tarayıcı önce HTML entity çözer, ardından JS string escape'i çözer. Çift katmanlı decode sırası doğru yönetilmezse tırnak kırılması (quote escaping bypass) gerçekleşir.
* **Nested URL Encoding in JS Schemes:** `javascript:fetch(decodeURIComponent('%2fapi%2fkeys'))` gibi senaryolarda JS Engine içinde ikinci bir URL decode katmanının tetiklenmesi.
