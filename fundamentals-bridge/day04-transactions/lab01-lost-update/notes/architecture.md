# Lost Update & Concurrency Anomalies

## Check-Then-Act Zaafı
Uygulama katmanı bakiyeyi şu adımlarla günceller:
1. `SELECT balance FROM accounts WHERE id = 1` -> (Örn: 100 TL okunur)
2. `if balance >= withdraw_amount:` -> (Uygulama içi kontrol: 100 >= 80 -> True)
3. `new_balance = balance - withdraw_amount` -> (Bellekte hesaplama: 100 - 80 = 20)
4. `UPDATE accounts SET balance = new_balance WHERE id = 1` -> (Yazma: 20 TL)

İki eşzamanlı işlem (Thread A ve Thread B) aynı anda geldiğinde:
- Thread A okur: 100 TL
- Thread B okur: 100 TL
- Thread A çeker ve 20 TL yazar.
- Thread B çeker ve 20 TL yazar (Thread A'nın yaptığı güncelleme ezilir: LOST UPDATE).
- Sonuç: Toplamda 160 TL çekilmiştir ancak hesapta hala 20 TL bakiye kalmıştır (Çifte Harcama / Double Spending).

## Doğru Mühendislik Çözümleri
1. Atomik Tek-Sorgu Güncellemesi (Database-level Atomic Decrement):
   `UPDATE accounts SET balance = balance - 80 WHERE id = 1 AND balance >= 80;`
   (Etkilenen satır sayısı 1 ise başarılı, 0 ise bakiye yetersiz).
2. Pessimistic Locking (`SELECT FOR UPDATE`).
3. Optimistic Locking (Versiyon kontrolü).
