# Mühendislik Analizi — Lab 02: Double URL Decoding & Path Normalization

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** İstemci `%252e%252e%252f` yolladığında ilk katman `%25` karakterini `%` yapar ve geriye `%2e%2e%2f` kalır. Yönlendirici (Router/WAF) bunu literal bir dize olarak algılar ve `/public` kapsamı içinde sayar. Arka plandaki zafiyetli servis veya custom middleware gereksiz yere `unquote()` fonksiyonunu tekrar çağırınca `%2e` karakteri `.` karakterine, `%2f` ise `/` karakterine dönüşerek traversal gerçekleşir.
* **Neden Engellendi:** Sıkılaştırılmış kodda veri tek bir otorite tarafından decode edildi; framework'ün ilk çözümü kabul edildi ve üstüne manuel decode uygulanmadı. Yollar `posixpath.normpath` ile kanonikleştirilerek kök sınırlayıcı dışına çıkışlar engellendi.

## 2. Root Cause
* **Interpretation Differentials:** Ağ bileşenlerinin URI üzerinde kaç kez decoding ve hangi sırada canonicalization çalıştıracağına dair ortak bir kontratının olmaması.
* **Redundant Decoding:** Ham girdinin yaşam döngüsü boyunca birden fazla kez `decode()` / `unquote()` işlemine tabi tutulması.

## 3. Platform Davranışları
* **Nginx:** `proxy_pass http://backend;` ile `proxy_pass http://backend$request_uri;` farklı davranır. İlki `$uri` (normalize edilmiş ve decode edilmiş) iletirken, ikincisi ham request URI'yi iletir.
* **Tomcat / Spring:** `;` (matrix parameters) ve `%252f` karakterlerinde RFC uyumsuzlukları nedeniyle Reverse Proxy'nin path sonu sandığı yeri backend parametre başı sanabilir (Path Truncation).

## 4. Kalıcı Savunma (Remediation)
1. **Single Decode Policy:** Bir girdi sistem sınırına girdiğinde yalnızca bir kez decode edilmelidir.
2. **Reverse Proxy Yapılandırması:** Nginx tarafında path kısıtlamaları yapılırken `location /admin` yerine normalleştirilmiş `$uri` değişkeni referans alınmalı ve proxy geçişlerinde çift decode'a sebep olacak direktiflerden kaçınılmalıdır.
3. **Safe Canonicalization:** Dosya sistemi veya router işlemlerinde regex replace yerine deterministik path resolver (`os.path.normpath` / `pathlib.Path.resolve()`) kullanılmalıdır.

## 5. Doğrulama
`tests/test-suite.sh` betiği ile hem double-encoded traversal hem de meşru istekler izole portlarda otomatik test edilerek doğrulanmıştır.

## 6. Varyant Analizi
* **Reverse Proxy Cache Poisoning:** Proxy `%2f` karakterini decode edip cache key oluştururken, backend encode edilmiş halini arar; farklı kullanıcılar aynı cache'e yönlendirilir.
* **WAF Evasion (SQLi/XSS):** `%2527` (`%27` -> `'`) WAF'tan tırnak işareti olmadan geçer, backend'de dynamic SQL çalıştıran kod bir daha decode ederse SQL Injection tetiklenir.
