# Vaka Analizi: Session Fixation (Oturum Sabitleme) ve Session Hijacking Savunması

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** Sistem, anonim kullanıcı için üretilen veya URL/çerez ile dışarıdan dayatılan Session ID'yi kimlik doğrulama sonrasında da korumuştur. Saldırgan önceden bildiği oturum anahtarı üzerinden kurbanın oturumuna doğrudan yetkisiz erişim sağlamıştır.
- **Sıkılaştırılmış Durumda:** Kimlik doğrulama işlemi gerçekleştiği anda `session.regenerate()` çağrılarak mevcut oturum kimliği yok edilmiş, kriptografik olarak rastgele yeni bir Session ID atanmıştır. Saldırganın bildiği eski kimlik geçersiz kalmıştır.

## 2. Root Cause

- Oturum yaşam döngüsünde yetki seviyesi değişiminin (Anonim -> Yetkili) göz ardı edilmesi.
- Oturum kimliğinin (Session Token) statik kalması ve sunucunun istemci tarafından dayatılan oturum anahtarlarını doğrulamadan kabul etmesi (Session Adopting).

## 3. Platform / Framework Kontrolleri

- Modern web çatıları (Express-session, Django, Spring Security, ASP.NET Core) varsayılan veya yapılandırılabilir oturum yenileme API'leri sunar.
- RFC 6265bis uyarınca oturum çerezleri URL üzerinden değil, yalnızca `Set-Cookie` başlığı ile taşınmalıdır.

## 4. Remediation (Düzeltme Adımları)

1. **Zorunlu Oturum Yenileme (Session Regeneration):** Login, Logout, şifre sıfırlama ve rol değişimlerinde oturum kimliğini derhal yenile:

```javascript
req.session.regenerate((err) => {
  req.session.userId = user.id;
});
```

# Katı Çerez Bayrakları:

HttpOnly: XSS üzerinden çalınmayı engeller.

Secure: Yalnızca TLS/HTTPS üzerinden iletilmesini zorunlu kılar.

SameSite=Lax / Strict: CSRF ve oturum sızıntılarını kısıtlar.

URL Parametresinde Oturum Reddi: URL query parametrelerinden (örn: ?sid=...) oturum kabulünü tamamen devre dışı bırak.

Zaman Aşımı ve İmha: Idle timeout (örn. 15-30 dk) ve Absolute timeout (örn. 8-12 saat) politikaları tanımla; oturum sonlandığında veritabanı veya Redis tarafındaki oturum kaydını tamamen sil.

# 5. Doğrulama

Kullanıcı oturum açmadan önce tarayıcıdaki oturum çerezinin değerini kaydet.

Başarılı kimlik doğrulama isteği gönder.

Yanıtın Set-Cookie başlığındaki oturum değerinin eskisinden farklı olduğunu doğrula.

Eski çerez değeri ile yetkili bir uç noktaya istek atıldığında 401 Unauthorized alındığını teyit et.

# 6. Variant Analysis

Subdomain Cookie Forgery: Saldırganın kontrolündeki güvensiz bir alt alan adından (evil.target.com) ana kökene (target.com) yönelik oturum çerezi basılması.

XSS ile Çerez Enjeksiyonu: document.cookie üzerinden saldırganın belirlediği oturum anahtarının kurbanın tarayıcısına zorla yazılması.
