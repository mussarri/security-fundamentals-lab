# Vaka Analizi: Oturum Yaşam Döngüsü (Session Lifecycle) ve Katı JWT Claims Doğrulaması

## 1. Neden İncelendi?
- Yalnızca çerezin `HttpOnly` veya JWT imzasının geçerli olması oturum güvenliğini sağlamaz.
- Oturum sonlandırma (logout), şifre değiştirme veya yetki güncelleme durumlarında eski oturumların canlı kalması (**Session Revocation Failure**), sistemin durum değişmezini (`State/Invariant`) bozar.
- JWT tarafında `iss`, `aud`, `exp` denetimleri yapılmazsa, başka bir servis için üretilmiş yetkisiz token'lar kritik API'leri tetikleyebilir.

## 2. Root Cause
1. **State / Invariant Failure:** Şifre değiştiğinde veya kullanıcı hesabı dondurulduğunda tüm oturumların düşmesi değişmezinin (invariant) korunmaması.
2. **Trust Boundary Failure:** JWT payload'undaki taleplerin (Claims) denetlenmeden sadece kriptografik imzaya güvenilerek yetkilendirme verilmesi.

## 3. Mimari Savunma Stratejisi
- **Session Versiyonlama:** Her kullanıcı kaydında bir `session_version` tutulur. Şifre değiştiğinde veya yönetici "Tüm cihazlardan çıkış yap" dediğinde bu versiyon artırılır. Eski oturumlar eşleşmediği an reddedilir.
- **Strict Claims Validation:**
  - `iss`: Token'ın güvenilir kimlik sağlayıcıdan geldiği teyit edilir.
  - `aud`: Token'ın spesifik olarak o mikroservis için üretildiği doğrulanır (Confused Deputy engeli).
  - `exp` & `nbf`: Zaman damgası denetlenir.


## 4. Doğrulama
```bash
./tests/test-session-jwt-lifecycle-mitigation.sh
