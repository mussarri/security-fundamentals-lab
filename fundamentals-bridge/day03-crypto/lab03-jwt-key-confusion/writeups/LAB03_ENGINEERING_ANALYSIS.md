# Mühendislik Analizi — Lab 03: Asymmetric vs. Symmetric Key Confusion (JWT RS256 -> HS256)

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli uygulama, token başlığındaki (`header.alg`) algoritma bildirimini güvenilir kabul ederek kütüphanenin `algorithms` parametresine dinamik aktardı. Saldırgan `RS256` yerine `HS256` seçip, sunucunun herkes tarafından okunabilen RSA Genel Anahtarını (Public Key) bir HMAC parolası olarak kullandı. Backend doğrulama motoru `alg: HS256` gördüğü için elindeki public key'i simetrik bir secret saydı ve HMAC doğrulaması başarılı oldu.
* **Neden Engellendi:** Sıkılaştırılmış serviste algoritma alanı asla istemcinin kontrolüne bırakılmadı; `algorithms=["RS256"]` ile statik bir allowlist zorunlu kılındı. Token başlığında `HS256`, `none` veya başka bir algoritma geldiğinde PyJWT `InvalidAlgorithmError` fırlatarak işlemi imza hesaplamasına dahi sokmadan 403 ile reddetti.

## 2. Root Cause
* **Interpretation Differentials:** Aynı bayt dizisinin (Public Key PEM), asimetrik algoritmada genel doğrulama anahtarı, simetrik algoritmada ise gizli parola (HMAC key) olarak iki farklı anlamsal rolle yorumlanması.
* **Trust Boundary Failures:** Doğrulamanın hangi kriptografik algoritmayla yapılacağı kararının, imzasını doğrulamaya çalıştığımız güvensiz girdi (token header) tarafından dikte edilmesi.

## 3. Platform Davranışları
* **PyJWT:** Modern sürümlerinde (`>=2.0.0`) `algorithms` parametresi zorunludur. Ancak geliştirici `algorithms=["RS256", "HS256"]` şeklinde karma bir liste verirse veya token header'dan dinamik çekerse zaaf tekrar oluşur.
* **Node.js `jsonwebtoken`:** Geçmiş sürümlerde (CVE-2015-9235 vb.) algoritma parametresi verilmediğinde header'daki algoritmaya otomatik uyum sağlayarak bu açığın dünyadaki en yaygın örneklerini üretmiştir.

## 4. Kalıcı Savunma (Remediation)
1. **Algoritmayı Sabitle (Enforce Single Algorithm):**
```python
   jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
```
Asla Header'dan Algoritma Seçmeyin: jwt.get_unverified_header(token)['alg'] bilgisini alıp decode parametresi olarak iletmeyin.

Anahtar Türü Ayrımı (Type-Safe Key Management): Asimetrik doğrulamada genel anahtarın RSAPublicKey nesnesi olduğundan emin olun; ham dize (string/bytes) parametresi kabul eden kütüphanelerde simetrik fallback riskine dikkat edin.

## 5. Doğrulama
tests/test-suite.sh koşturulduğunda, tests/exploit_key_confusion.py script'inin sunucu Genel Anahtarı ile sahte bir token üretip zafiyetli sunucuda admin yetkisi aldığı, sabit RS256 kullanan sıkılaştırılmış uç noktada ise atağın 403 ile engellendiği doğrulanmıştır.

## 6. Varyant Analizi
Algorithm None Attack: Saldırganın alg: "none" gönderip imza bloğunu tamamen silerek imzasız token kabul ettirmesi.

JWK Injection / JKU Spoofing: Saldırganın token başlığına kendi genel anahtarını (jwk) veya sahte anahtar sunucusunu (jku) koyup sunucuya o anahtarla doğrulama yaptırması.
