# Mühendislik Analizi — Lab 01: Unicode NFKC Compatibility Normalization & Account Collision

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli uygulamada `adm\u2170n` girdisi Python'ın `isalnum()` fonksiyonundan geçti (çünkü Roma rakamı Unicode harf/sayı kümesindedir). Ardından veritabanında `WHERE username = 'adm\u2170n'` sorgusu çalıştırıldı ve sistemde bu adda biri olmadığı için müsait kabul edildi. Hemen ardından `unicodedata.normalize('NFKC', username)` çağrılınca `\u2170` karakteri standart ASCII `i` karakterine indirgendi ve veritabanı yazma aşamasında var olan `admin` ile çakışma oluştu.
* **Neden Engellendi:** Sıkılaştırılmış kodda kanonikleştirme (NFKC + casefold) doğrulama ve veritabanı sorgularının en başına alındı. Girdi henüz doğrulama aşamasındayken `admin` haline getirildi; veritabanı sorgusu `admin` için çalıştırıldığında kayıt anında tespit edilerek 409 Conflict ile geri çevrildi.

## 2. Root Cause
* **Interpretation Differentials:** Ham veri temsili ile sistemin tükettiği normalize edilmiş biçim arasındaki fark.
* **Order of Execution Failure:** Kanonikleştirmenin doğrulama ve varlık kontrollerinden SONRA yapılması.

## 3. Platform Davranışları
* **Python `isalnum()`:** ASCII dışındaki yüzlerce Unicode karakterine (ör. tam genişlikli harfler, Roma rakamları, üst/alt simgeler) `True` döner.
* **SQLite / MySQL Collation:** Veritabanı collation ayarı `utf8mb4_unicode_ci` olduğunda bazı homoglyph'ler eşit sayılırken, varsayılan binary/UTF-8 karşılaştırmasında farklı kabul edilir. Kod ile veritabanı aynı normalizasyon sözleşmesini paylaşmazsa bypass doğar.

## 4. Kalıcı Savunma (Remediation)
1. **Canonicalize First, Validate Second:** Girdi hiçbir mantıksal veya sözdizimsel kontrole sokulmadan önce kanonikleştirilmeli (`NFKC` + `casefold`).
2. **Strict Character Allowlist:** Kullanıcı adları, dosya adları ve rota parametrelerinde geniş kapsamlı `isalnum()` yerine kesin regex allowlist'leri (`^[a-z0-9_]+$`) kullanılmalı.
3. **Database-level Constraint:** DB üzerinde normalize edilmiş indeks ve `UNIQUE` kısıtları tanımlanarak uygulama mantığı atlansa dahi veri tabanının ezilmesi engellenmelidir.

## 5. Doğrulama
`tests/test-suite.sh` betiği ile hem izole portlarda zafiyetin sömürülmesi hem de sıkılaştırılmış uç noktanın 409 Conflict ile atağı kestiği doğrulanmıştır.

## 6. Varyant Analizi
* **WAF Filter Bypass:** `<scr\u0131pt>` veya tam genişlikli `＜script＞` (`U+FF1C` / `U+FF1E`) gönderildiğinde WAF ASCII `<script>` görmediği için geçirir; arka plandaki Markdown/HTML motoru NFKC uyguladığında XSS çalışır.
* **Host Header Routing:** `adm\u2170n.internal.corp` adresi proxy seviyesinde bilinmeyen host kabul edilip dışa yönlendirilirken, backend resolver'ı NFKC ile `admin.internal.corp` rotasını çalıştırabilir.
