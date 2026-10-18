# Mühendislik Analizi — Lab 02: Length Extension Attack & HMAC Design

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli mimaride geliştirici `hashlib.sha256(secret + data)` kullandı. Merkle-Damgård yapısında SHA-256 çıktısı, son bloğun sıkıştırılmış iç durumuna ($h_0 \dots h_7$) eşittir. Saldırgan gizli anahtarı bilmese bile:
  1. Orijinal hash'i alıp register durumuna yükledi.
  2. Orijinal mesaj uzunluğunu hesaplayarak Merkle-Damgård dolgusunu (padding) elle inşa etti.
  3. Yeni veri bloğunu (`&role=admin`) bu durumun üzerine sıkıştırıp geçerli bir hash üretti.
  4. Uygulama veriyi aldığında son parametre (`role=admin`) önceki `role=guest` değerini ezdi (*last-wins*).
* **Neden Engellendi:** Sıkılaştırılmış kodda `hmac.new(key, data, hashlib.sha256)` devreye alındı. HMAC iki aşamalı çalışır ($H((K \oplus opad) \ \vert{}\vert{} \ H((K \oplus ipad) \ \vert{}\vert{} \ M))$). Dıştaki hash işlemi içteki durumu tamamen maskeler. Dolayısıyla içteki veriye blok eklemek dış hash'i tamamen bozar ve Length Extension Attack matematiksel olarak imkansız hale gelir.

## 2. Root Cause
* **Interpretation Differentials:** Standart özet fonksiyonlarının (SHA-256) iteratif durumunun, Mesaj Doğrulama Kodu (MAC) gibi davranabileceği yanılgısı.
* **Code / Data Separation Failures:** Gizli anahtar ile kullanıcı verisinin yapısal bir sınır olmadan ham bayt olarak yan yana dizilmesi.

## 3. Platform Davranışları
* **Kırılgan Algoritmalar:** Merkle-Damgård kullanan tüm hash'ler: MD5, SHA-1, SHA-256, SHA-512.
* **Doğal Dirençli Algoritmalar:** Sünger (Sponge) yapısını kullanan **SHA-3**, **Keccak** ve ağaç yapılı **BLAKE2 / BLAKE3** mimarileri Length Extension Attack'a karşı doğası gereği bağışıktır (ancak yine de doğrudan MAC API'leri kullanılmalıdır).

## 4. Kalıcı Savunma (Remediation)
1. **Asla `hash(secret + data)` Yazmayın:** Bütünlük ve kimlik doğrulama için her zaman standart `HMAC` (RFC 2104) kullanın.
2. **Timing-Safe Comparison:** İmzaları `==` operatörü yerine `hmac.compare_digest()` ile karşılaştırarak yan kanal (timing) saldırılarını engelleyin.
3. **Modern Kripto Primitifleri:** Yeni tasarımlarda `HMAC-SHA256` veya yerleşik keyed-hash desteği olan `BLAKE3` tercih edin.

## 5. Doğrulama
`tests/test-suite.sh` koşturulduğunda, `tests/exploit_lea.py` script'inin sunucu anahtarını bilmeden zafiyetli sunucuda admin yetkisini tetiklediği, HMAC kullanan sunucuda ise atağın 403 ile püskürtüldüğü teyit edilmiştir.

## 6. Varyant Analizi
* **Flickr API Vulnerability (Tarihsel):** Flickr'ın eski API imzalama protokolünde `MD5(secret || params)` kullanması sonucu kullanıcıların yetki yükseltmesi.
* **Hash-based Download Links:** Dosya indirme sistemlerinde dosya adı ve sürenin `SHA1(secret + url)` ile imzalanması; saldırganın süreyi uzatıp geçerli URL türetmesi.
