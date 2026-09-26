# Vaka Analizi: UNION-based SQL Injection ve Hassas Veri Sızıntısı

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** `category` query parametresi doğrudan `SELECT id, name, price FROM products WHERE category = '${category}';` sorgusuna eklendi. Saldırgan `ORDER BY` tekniği ile kolon sayısının 3 olduğunu doğruladı ve `UNION SELECT id, username, credit_card FROM users--;` ifadesiyle `users` tablosundaki kredi kartı numaralarını ürün listeleme arayüzünden başarıyla sızdırdı.
- **Sıkılaştırılmış Durumda:** `db.prepare('SELECT id, name, price FROM products WHERE category = ?;')` kullanılarak sorgu önceden derlendi. Girdi içerisindeki `UNION`, `'` ve `--` karakterleri komut değil, düz metin verisi olarak ele alındı.

## 2. Root Cause

Dinamik sorgu inşasında kullanıcı girdisinin ham metin olarak SQL cümlesine eklenmesi (Code/Data Separation ilkesinin ihlali).

## 3. Platform / Database Kontrolleri

- Modern ORM'ler (Prisma, TypeORM, Drizzle) sorguları varsayılan olarak parametreli hazırlar.
- Veritabanı hata mesajlarının (`1st ORDER BY term out of range`) doğrudan istemciye dönülmesi saldırgan için keşif sürecini hızlandırır.

## 4. Remediation (Düzeltme)

1. **Prepared Statements:** Dinamik parametreleri her zaman yer tutucular (`?`, `$1`) ile bağla.
2. **Generic Error Responses:** Veritabanı motorunun dahili hata mesajlarını istemciye iletme, sunucuda maskele.
3. **Sıkı Veritabanı Rolleri:** Uygulama kullanıcısının haklarını yalnızca zorunlu tablolarla sınırla.

## 5. Doğrulama

```bash
./tests/test-union-sqli-mitigation.sh
```

# 6. Variant Analysis

Error-based SQLi: CAST(...) gibi fonksiyonlarla kasıtlı hata üreterek verinin hata mesajı içinde okunması.

Blind SQLi (Boolean & Time-based): Yanıt dönmeyen veya hata göstermeyen arayüzlerde ikili mantık ve zaman gecikmeleri ile veri sızdırma.
