# Vaka Analizi: SQL Injection (Authentication Bypass) ve Prepared Statements Mimarisi

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** `username=admin' --` payload'u dinamik SQL string birleştirmesi sırasında sorgunun mantıksal sözdizimini değiştirmiştir. Girdideki `'` karakteri dizeyi kapatmış, `--` ise şifre denetimini yorum satırına çevirerek kimlik doğrulamanın atlanmasını sağlamıştır.
- **Sıkılaştırılmış Durumda:** `db.prepare()` ile sorgu ağacı önceden derlenmiş, parametreler veritabanı motoruna derleme sonrasında bağımsız literal değerler olarak verilmiştir. Girdideki tırnak ve tire işaretleri sözdizimi komutu olarak değerlendirilmemiştir.

## 2. Root Cause

Kullanıcı girdilerinin SQL parser'ına ham metin olarak verilmesi ve veri (data) ile komut (instruction) katmanlarının ayrıştırılmaması.

## 3. Platform / Framework Kontrolleri

- Modern ORM'ler (Prisma, TypeORM, Drizzle) tüm sorguları otomatik olarak parametreli şablonlara (`$1, $2`) dönüştürür.
- Ham sorgu çalıştıran fonksiyonlar (`$queryRawUnsafe`) kullanılmadığı sürece SQLi riski minimize edilir.

## 4. Remediation (Düzeltme)

1. **Parametreli Sorgular (Prepared Statements):** String birleştirme (`+`, `${}`) yerine daima veritabanı sürücüsünün parametre bağlama arayüzünü kullan.
2. **Kapsamlı Girdi Doğrulaması:** Tip ve desen doğrulaması yaparak beklenmeyen karakter dizilerini kontrol et.
3. **Veritabanı İzinlerinin Sınırlandırılması:** Web servisinin kullandığı veritabanı kullanıcısına yalnızca gerekli tablolarda DML (`SELECT`, `INSERT`, `UPDATE`) yetkisi tanı.

## 5. Doğrulama

```bash
./tests/test-sqli-mitigation.sh
```

# 6. Variant Analysis

UNION-based SQLi: Ek sorgu sonuçlarını meşru tablo çıktısına ekleyerek hassas tabloların dökümünü alma.

Error-based SQLi: Veritabanı hata mesajlarının (syntax error at or near...) kullanıcıya yansıtılması üzerinden veriyi sızdırma.

Blind SQLi (Boolean/Time): Uygulama hiçbir veri veya hata dönmediğinde koşullu sorgular ve SLEEP() fonksiyonları ile ikili arama yaparak veriyi tek tek sızdırma.
