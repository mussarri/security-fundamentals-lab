# Mühendislik Analizi — Lab 01: Validation vs. Consumption Mismatch (JSON Duplicate Keys)

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli mimaride doğrulama (WAF/Gateway) ile tüketim (Backend) katmanları iki farklı JSON ayrıştırma yaklaşımı kullandı. Gateway ilk karşılaştığı `"role": "user"` anahtarını alıp yetkilendirmeyi onaylarken; backend'deki standart Python `json.loads` kütüphanesi son anahtar olan `"role": "admin"` değerini hash-map içine yazarak önceki değeri ezdi (*last-key-wins*).
* **Neden Engellendi:** Sıkılaştırılmış serviste standart gevşek JSON ayrıştırıcı yerine `object_pairs_hook` ile nesne alanları tek tek denetlendi. Bir anahtarın birden fazla kez tanımlandığı anda sözdizimi belirsizliği kabul edilmeyerek istek `400 Bad Request` ile sonlandırıldı.

## 2. Root Cause
* **Interpretation Differentials:** RFC 8259'un yinelenen anahtarları yasaklamayıp serbest bırakması sonucu, sistemdeki bileşenlerin bu durumu farklı çözmesi.
* **Validation/Consumption Mismatch:** Güvenlik kararını veren kod ile iş mantığını yürüten kodun aynı veri nesnesini (single source of truth) paylaşmaması.

## 3. Platform Davranışları
* **Python `json.loads`:** Varsayılan olarak *last-key-wins* kuralını uygular.
* **Go `encoding/json`:** Struct içine decode edilirken yinelenen anahtarlarda son değer yazılır. Ancak harici kütüphaneler (`json.Decoder.DisallowUnknownFields` vb.) veya map dönüşümlerinde farklılık gösterebilir.
* **JavaScript / Node.js `JSON.parse`:** *Last-key-wins* uygular.
* **Java Jackson / Gson:** Konfigürasyona bağlı olarak istisna fırlatabilir veya son/ilk değeri tutabilir.

## 4. Kalıcı Savunma (Remediation)
1. **Strict Reject Policy:** API sınırlarında yinelenen JSON anahtarları doğrudan reddedilmelidir (ör. Python için custom hook, Pydantic/FastAPI veya API Gateway katmanında strict schema validator).
2. **Single Parsing Instance:** Mümkünse doğrulama ve tüketim için ayrı ayrıştırıcılar çalıştırmak yerine, Gateway'de ayrıştırılıp doğrulanmış ve normalize edilmiş nesne backend'e iletilmelidir.

## 5. Doğrulama
`tests/test-suite.sh` betiği ile yinelenen anahtar içeren payload'un zafiyetli sunucuda yetki yükseltmeye izin verdiği, sıkılaştırılmış uç noktada ise 400 koduyla reddedildiği kanıtlanmıştır.

## 6. Varyant Analizi
* **XML Attribute / Element Duplication:** XML parser'larında aynı isimli iki attribute veya tag durumunda SOAP/SAML doğrulama bypass'ları.
* **HTTP Parameter Pollution (HPP):** `?role=user&role=admin` gönderildiğinde PHP'nin son değeri, ASP.NET'in virgülle birleştirilmiş halini (`user,admin`) alması.
* **JWT Claim Duplication:** Token header veya payload'unda iki `"alg"` veya `"sub"` bulunması durumunda imza denetleyici ile yetkilendirme motorunun ayrışması.
