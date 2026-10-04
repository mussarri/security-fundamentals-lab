# Mühendislik Analizi — Lab 01: Fast Hash vs. Memory-Hard KDF

## 1. Neden Çalıştı / Neden Engellendi?
* **Zafiyetli Uygulamada:** Salt eklenmiş `SHA-256(salt + password)` yapısı kullanıldı. Salt, rainbow table saldırılarını ve aynı şifreyi seçen kullanıcıların hash eşitliğini önlese de; algoritmanın kendisi bellek tüketmeyen ve CPU/ASIC üzerinde aşırı hızlı hesaplanan (mikrosaniye altı) bir fonksiyondur. Sızdırılan bir veritabanında saldırgan modern bir GPU ile saniyede onlarca milyar deneme yaparak 8-10 karakterlik parolaları saatler içinde çözer.
* **Sıkılaştırılmış Uygulamada:** `Argon2id` (RFC 9106) devreye alındı. Her bir hash hesaplaması için bilerek **64 MiB RAM** ve **2 iterasyonluk CPU iş gücü** tahsis edildi. Bir GPU çipinde binlerce çekirdek bulunmasına rağmen çip üstü bellek (SRAM) çok küçüktür; her deneme 64 MiB bellek talep ettiğinde GPU'nun paralel işlem kabiliyeti felç olur (Memory-Hardness).

## 2. Root Cause
* **Interpretation Differentials:** Hash fonksiyonlarının amacının yanlış yorumlanması. Geliştirici "kriptografik olarak güvenli" (tek yönlü, çakışma dirençli) sıfatını görünce SHA-256'nın şifre saklama için de yeterli olduğunu varsayar. Ancak parola korumada tek yönlülük yetmez; fonksiyonun bilerek yavaş ve donanımsal olarak pahalı olması şarttır.
* **Lack of Work Factor:** SHA-256'da zaman ve bellek maliyetini donanım gelişimine göre ayarlayabilecek dinamik bir iş faktörü (work factor / cost parameter) parametresi yoktur.

## 3. Platform Davranışları
* **GPU / ASIC Çipler:** SHA-256, basit bit kaydırma ve XOR operasyonlarından ibarettir. ASIC donanımları bu işlemi minimum enerji ve sıfır RAM ile saniyede trilyonlarca kez yapar.
* **Argon2id:** Şifreleme dünyasındaki en güncel şampiyondur (Password Hashing Competition galibi). Argon2d (GPU direnci) ve Argon2i (yan kanal direnci) hibritidir.

## 4. Kalıcı Savunma (Remediation)
1. **Argon2id Kullanımı:** Yeni sistemlerde parola saklama standardı olarak Argon2id tercih edilmelidir (`m=65536, t=2, p=2` veya donanıma göre `m=19456, t=2, p=1`).
2. **Alternatif Standartlar:** Argon2id desteklenmeyen legacy/gömülü sistemlerde `bcrypt` (work factor $\ge 12$) veya `scrypt` kullanılmalıdır.
3. **Rehash Desteği:** Şifre doğrulama akışında `ph.check_needs_rehash(stored_hash)` kontrolü yapılarak kullanıcı her giriş yaptığında hash maliyeti güncel tutulmalıdır.

## 5. Doğrulama
`tests/test_hashing.py` test paketi çalıştırıldığında:
- SHA-256'nın hash başına <0.05 ms sürdüğü,
- Argon2id'nin ise ~30-70 ms ve 64 MB RAM tüketerek hesaplandığı somut ölçümlerle doğrulanmıştır.

## 6. Varyant Analizi
* **HMAC as Password Storage:** `HMAC-SHA256(key, password)` kullanımı; anahtar güvenliğini sağlasa da yine bellek maliyeti olmadığı için GPU karşısında kırılgandır.
* **MD5 / NTLM:** Eski Windows ve PHP sistemlerinde kalan tuzsuz veya tek iterasyonlu hash yapıları; saniyeler içinde kırılır.


Root Cause: Düşük entropili sırların (insan parolaları), donanımsal maliyeti sıfır olan genel amaçlı özet algoritmalarıyla (SHA-256) saklanması.

Kural: Şifre saklamak için "hızlı" olan her algoritma kusurludur. Güvenlik, fonksiyonun bilerek RAM tüketmesinden (Memory-Hardness) ve ayarlanabilir zaman maliyetinden (Work Factor) gelir.

Standart: Modern mimariler için varsayılan çözüm Argon2id'dir (RFC 9106).