# DAY 2–3: Authentication Lifecycle Lab

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** 
  1. Hareketsizlik durumunda oturum kapatılmazsa açık kalan ekranlar yetkisiz kişilerin eline geçer.
  2. Parola değiştiğinde veritabanındaki oturum kayıtları temizlenmezse, saldırganın elindeki çerez sonsuza dek çalışmaya devam eder.
  3. Refresh Token rotasyonu yapılmazsa, tek bir token sızıntısı kalıcı erişim sağlar; reuse tespiti olmazsa saldırganın kurbanın arkasından token yenilediği anlaşılamaz.
- **Sıkılaştırılmış Durumda:**
  1. Login anında Session ID rotate edilir (Fixation engeli).
  2. Idle (3 sn) ve Absolute (8 sn) süre kısıtlamaları state üzerinden işletilir.
  3. Parola değiştiğinde kullanıcının tüm oturumları `sessions` haritasından düşürülür.
  4. Refresh Token tek kullanımlık yapılır; kullanılmış bir token ile gelinirse o token ailesinin (`familyId`) tamamı iptal edilir (**Reuse Detection**).

## 2. Root Cause
**State / Invariant Failure.** Sistem durumunun (oturum süresi, parola güncelliği, token kullanım geçmişi) tutarlı bir şekilde takip edilmemesi ve değişmezlerin (invariants) ihlal edilmesi.

## 3. Platform Kontrolleri
- Parola hashlemede `scrypt` veya `Argon2id` kullanılmalıdır (GPU/ASIC direnci).
- Hash karşılaştırmalarında `crypto.timingSafeEqual` ile yan kanal zamanlama saldırıları (Timing Attacks) önlenir.

## 4. Remediation (Düzeltme Adımları)
1. **Zorunlu Session Regeneration:** Kimlik doğrulama aşamasında oturum anahtarını mutlak yenile.
2. **Çift Zaman Aşımı:** Hem hareketsizlik (Idle) hem de mutlak maksimum ömür (Absolute) tanımla.
3. **Token Ailesi Takibi:** Refresh token'ları bağlı oldukları `familyId` ile sakla; tekrar kullanım durumunda tüm aileyi revoke et.

## 5. Doğrulama
```bash
./gap-closure-v2/day-02-03-auth-lifecycle/test-suite.sh
