# Mühendislik Analizi — Lab 04: Predictable PRNG vs. CSPRNG (Token Generation)

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli uygulamada token üretimi standart `random` kütüphanesi ve zaman tabanlı bir tohum (`time.time()`) ile gerçekleştirildi. Unix zaman damgaları saniye veya milisaniye hassasiyetinde sınırlı bir aralıkta hareket ettiğinden, saldırgan isteğin ulaştığı anı bildiğinde arama uzayını (search space) birkaç saniyelik bir dilime daralttı. Seed'i kendi tarafında başlatarak kurbanın e-postasına gönderilen token'ı birebir yeniden üretti ve hesabı ele geçirdi.
* **Neden Engellendi:** Sıkılaştırılmış uygulamada Python'ın kriptografik olarak güvenli rastgele sayı üreteci olan `secrets` modülü (`secrets.token_urlsafe(32)`) kullanıldı. Bu modül doğrudan işletim sisteminin yüksek entropili çekirdek havuzlarından (`/dev/urandom`, `getrandom()`) beslenir. Durum geri-mühendisliği matematiksel olarak imkansızdır ve $2^{256}$ arama uzayı kaba kuvvet saldırılarını olanaksız kılar.

## 2. Root Cause
* **Trust Boundary Failures:** İstatistiksel rastgelelik üreten kütüphanelerin (PRNG), güvenlik kritik oturum/parola sınırlarında kullanılması.
* **Predictable Seeding:** Deterministik, düşük entropili girdi değerlerinin (zaman, PID) üreteç tohumu olarak seçilmesi.

## 3. Platform Davranışları
* **Python `random` (MT19937):** 19937-bit periyoda sahip Mersenne Twister kullanır. İstatistiki olarak kusursuz bir dağılım verse de kriptografik güvenliği yoktur; 624 ardışık 32-bit çıktıdan sonraki tüm sayılar %100 doğrulukla tahmin edilebilir.
* **JavaScript `Math.random()` (Xoroshiro128+ / V8):** Yalnızca birkaç çıktı gözlemlenerek iç durum yeniden oluşturulabilir. Web ortamında `crypto.getRandomValues()` zorunludur.
* **Python `secrets` / `os.urandom`:** Donanım gürültüsü ve OS entropisiyle beslenen, blok kırılamayan CSPRNG arayüzüdür.

## 4. Kalıcı Savunma (Remediation)
1. **Daima `secrets` Kullanın:**
```python
   # Güvenli Token Üretimi
   import secrets
   token = secrets.token_urlsafe(32) # 256-bit entropi
```
Sabit Zamanlı Doğrulama: Token doğrulamalarında zamanlama analizi sızıntılarını önlemek için hmac.compare_digest() tercih edilmelidir.

Kısa Ömür ve Tek Kullanımlık İlkesi: Güvenlik token'ları zaman kısıtlı (TTL) olmalı ve doğrulandığı an veritabanından/bellekten silinmelidir.

## 5. Doğrulama
tests/test-suite.sh betiği ile PRNG kullanılan sistemde token'ın saniyeler içinde simüle edilip doğrulandığı, CSPRNG kullanılan sistemde ise atağın başarısız olduğu kanıtlanmıştır.

## 6. Varyant Analizi
Password Reset Poisoning via Host Header + PRNG: Deterministik token'ların e-posta yerine saldırgan sunucusuna yönlendirilmesi kombinasyonu.

CSRF Token Predictability: Formlara gömülen CSRF anahtarlarının PRNG ile üretilmesi sonucu kullanıcı adına istek sahteciliği yapılması.
