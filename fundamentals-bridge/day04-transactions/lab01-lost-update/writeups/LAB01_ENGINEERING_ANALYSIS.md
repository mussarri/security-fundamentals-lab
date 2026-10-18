# Mühendislik Analizi — Lab 01: Lost Update & Concurrency Anomalies

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli uç nokta `Check-Then-Act` modelini benimsedi. İstek 1 ve İstek 2 neredeyse aynı anda gelerek veritabanındaki 100 TL bakiyeyi okudu. Her iki iş parçacığı da kendi yerel belleğinde `100 >= 80` doğrulamasını yaptı ve `100 - 80 = 20` sonucunu hesapladı. İlk yazan iş parçacığının ardından ikinci iş parçacığı da veritabanına `20` değerini yazarak önceki işlemin kaydını ezdi (*Lost Update*). Sonuç olarak sistemden 160 TL eksilmesine rağmen hesapta 20 TL kaldı.
* **Neden Engellendi:** Sıkılaştırılmış kodda veri uygulama belleğinde hesaplanıp mutlak değer olarak yazılmak yerine, veritabanı motorunun yerleşik atomikliğine devredildi:
  ```sql
  UPDATE accounts SET balance = balance - 80 WHERE id = 1 AND balance >= 80;
Veritabanı satır kilidini dahili olarak yönetti; ilk işlem bakiyeyi 20'ye düşürdü, hemen ardından gelen ikinci işlem için balance >= 80 şartı sağlanamadığından rowcount = 0 döndü ve işlem reddedildi. Ayrıca tablo seviyesindeki CHECK(balance >= 0) kısıtı negatif bakiye oluşumuna karşı ikinci bir savunma hattı sağladı.

## 2. Root Cause
State / Invariant Failures: İş kuralı değişmezinin (bakiye sıfırın altına düşemez) eşzamanlı çalışma ortamında korunmaması.

Non-Atomic Operations: Okuma (SELECT), doğrulama (if) ve güncelleme (UPDATE) adımlarının birbirinden kopuk ayrı adımlar olarak yürütülmesi.

## 3. Platform Davranışları
SQLite: Dosya seviyesinde kilit kullanır ancak varsayılan WAL (Write-Ahead Logging) veya multithreaded modda uygulama seviyesindeki okuma-yazma pencerelerini otomatik senkronize etmez.

PostgreSQL / MySQL (InnoDB): Varsayılan Read Committed izolasyon seviyesinde, iki farklı transaction aynı satırı bağımsız olarak okuyabilir. SELECT FOR UPDATE veya atomik UPDATE kullanılmadığı takdirde Lost Update anomalisi kaçınılmazdır.

## 4. Kalıcı Savunma (Remediation)
Atomic In-Database Operations:
Mümkün olan her senaryoda SET field = field - delta WHERE field >= delta kalıbını tercih edin.

Pessimistic Locking (Kritik İşlemlerde):
Karmaşık hesaplamalar gerekiyorsa transaction açıp satırı kilitleyin:
```sql
SQL
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- hesaplamalar...
UPDATE accounts SET balance = new_balance WHERE id = 1;
COMMIT;
```
Database Constraints: Veritabanı şemasına her zaman CHECK (balance >= 0) gibi kısıtlar ekleyin.

## 5. Doğrulama
tests/test-suite.sh betiği iki eşzamanlı iş parçacığı fırlatarak zafiyetli sunucuda çift çekimi tetiklemiş, sıkılaştırılmış uç noktada ise atomik güncelleme sayesinde ikinci isteğin 400 ile kesildiğini ve bakiyenin tutarlı kaldığını kanıtlamıştır.

## 6. Varyant Analizi
E-Ticaret Stok Tüketimi (Inventory Overselling): Son 1 adet kalan ürünün iki farklı kullanıcı tarafından aynı anda sepete eklenip satın alınması.

Kupon / Promosyon Kodu İstismarı: Tek kullanımlık indirim kuponunun saniyeler içinde paralel isteklerle birden fazla siparişte uygulanması.
