# Vaka Analizi: Blind SQL Injection (Boolean & Time-based Inference)

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** Arayüz veritabanı hatalarını ve veri satırlarını gizlemesine rağmen, `SUBSTR(pin,1,1)='7'` koşulu çalıştığında dönen boolean (`exists: true / false`) bayrağı yan kanal olarak kullanılmış ve veriler ikili arama mantığıyla tek tek sızdırılmıştır.
- **Sıkılaştırılmış Durumda:** `db.prepare('SELECT id FROM users WHERE username = ?')` kullanımıyla mantıksal operatörler ve `SUBSTR` fonksiyonu sözdizimsel bir komut olarak değil, aranan kullanıcı adının literal parçası olarak işlenmiştir.

## 2. Root Cause

Hata ve veri çıktılarını gizlemenin güvenliği sağlayacağı yanılgısı (Security through Obscurity). Veritabanı derleme katmanında girdi ve kod ayrımının yapılmaması.

## 3. Platform / Database Kontrolleri

- Veritabanı seviyesinde ağır hesaplama/gecikme fonksiyonlarının kısıtlanması.
- Blind SQLi binlerce deneme gerektirdiğinden API Gateway seviyesinde anomali tespiti ve IP Rate Limiting uygulanması.

## 4. Remediation (Düzeltme Adımları)

1. **Prepared Statements:** Tek ve kesin çözüm; parametrelerin sorgu iskeletinden ayrıştırılmasıdır.
2. **Kapsamlı Rate Limiting:** Tekil uç noktalara kısa sürede yapılan binlerce varyasyonlu isteğin bloklanması.
3. **Loglama ve SIEM Entegrasyonu:** `SUBSTR`, `ASCII`, `SLEEP` gibi analitik/sistem fonksiyonları içeren anormal query parametrelerinin WAF üzerinde yakalanması.

## 5. Doğrulama

```bash
./tests/test-blind-sqli-mitigation.sh
```

# 6. Variant Analysis

Time-based Blind SQLi: Arayüz yanıtı tamamen farksız olduğunda gecikme (pg_sleep(), SLEEP()) fonksiyonları üzerinden çıkarım yapılması.

Out-of-Band (OOB) SQLi: Doğrudan yanıt alınamadığında veritabanına DNS veya HTTP isteği (utl_http, xp_dirtree) attırılarak verinin saldırganın sunucusuna gönderilmesi.
