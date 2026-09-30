# DAY 1: Browser Security Lab v2

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** 
  1. Sunucu `Origin` başlığını dinamik olarak `Access-Control-Allow-Origin` alanına kopyalayıp `Access-Control-Allow-Credentials: true` döndüğü için, tarayıcının SOP (Same-Origin Policy) kalkanı devre dışı kaldı ve üçüncü taraf JavaScript kodu kurbanın çerezleriyle veri sızdırdı.
  2. Havale uç noktası sadece çerez varlığına güvendi; tarayıcıların çapraz kökenli POST isteklerinde çerezi istemsizce ekleme davranışından (Ambient Authority) yararlanılarak CSRF atağı başarıya ulaştı.
- **Sıkılaştırılmış Durumda:**
  1. Çerez `SameSite=Strict` olarak işaretlendi.
  2. Sunucu `Origin` başlığını katı allowlist ile doğruladı.
  3. Durum değiştiren POST işlemlerinde kriptografik `X-CSRF-Token` zorunlu tutuldu.

## 2. Root Cause
- **Trust Boundary Failure:** İstemciden gelen `Origin` ve ambient oturum çerezlerine doğrudan güvenilmesi.
- **SOP / CORS İhlali:** CORS'un bir güvenlik kalkanı değil, SOP'u bilinçli olarak gevşeten bir istisna mekanizması olduğunun göz ardı edilmesi.

## 3. Platform / Tarayıcı Kontrolleri
- **Origin vs Site:** 
  - `http://127.0.0.1:4001` ile `http://127.0.0.1:4002` aynı IP'de olsa dahi **farklı Origin**'lerdir (Port farklı).
- **SameSite Taksonomisi:**
  - `Strict`: Üçüncü taraf link tıklamalarında dahi çerez gönderilmez.
  - `Lax`: Sadece güvenli üst seviye navigasyonlarda (`GET <a href>`) gider; POST ve AJAX'ta gitmez.
  - `None`: Her durumda gider (Zorunlu `Secure` bayrağı gerektirir).

## 4. Remediation (Düzeltme)
1. **Dinamik Origin Yansıtmayı Yasakla:** Origin doğrulamasını sunucu taraflı sabit dizi ile yap.
2. **SameSite=Strict + Anti-CSRF Token Çift Katmanı:** Hassas durum değiştiren API'lerde çerez tek başına yetki vermemelidir.
3. **Preflight Doğrulaması:** OPTIONS yanıtında izin verilen header'ları katı tut.

## 5. Doğrulama
```bash
./gap-closure-v2/day-01-browser-lab-v2/test-suite.sh
cat << 'EOF' > gap-closure-v2/day-01-browser-lab-v2/README.md
```

# DAY 1: Browser Security Lab v2

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** 
  1. Sunucu `Origin` başlığını dinamik olarak `Access-Control-Allow-Origin` alanına kopyalayıp `Access-Control-Allow-Credentials: true` döndüğü için, tarayıcının SOP (Same-Origin Policy) kalkanı devre dışı kaldı ve üçüncü taraf JavaScript kodu kurbanın çerezleriyle veri sızdırdı.
  2. Havale uç noktası sadece çerez varlığına güvendi; tarayıcıların çapraz kökenli POST isteklerinde çerezi istemsizce ekleme davranışından (Ambient Authority) yararlanılarak CSRF atağı başarıya ulaştı.
- **Sıkılaştırılmış Durumda:**
  1. Çerez `SameSite=Strict` olarak işaretlendi.
  2. Sunucu `Origin` başlığını katı allowlist ile doğruladı.
  3. Durum değiştiren POST işlemlerinde kriptografik `X-CSRF-Token` zorunlu tutuldu.

## 2. Root Cause
- **Trust Boundary Failure:** İstemciden gelen `Origin` ve ambient oturum çerezlerine doğrudan güvenilmesi.
- **SOP / CORS İhlali:** CORS'un bir güvenlik kalkanı değil, SOP'u bilinçli olarak gevşeten bir istisna mekanizması olduğunun göz ardı edilmesi.

## 3. Platform / Tarayıcı Kontrolleri
- **Origin vs Site:** 
  - `http://127.0.0.1:4001` ile `http://127.0.0.1:4002` aynı IP'de olsa dahi **farklı Origin**'lerdir (Port farklı).
- **SameSite Taksonomisi:**
  - `Strict`: Üçüncü taraf link tıklamalarında dahi çerez gönderilmez.
  - `Lax`: Sadece güvenli üst seviye navigasyonlarda (`GET <a href>`) gider; POST ve AJAX'ta gitmez.
  - `None`: Her durumda gider (Zorunlu `Secure` bayrağı gerektirir).

## 4. Remediation (Düzeltme)
1. **Dinamik Origin Yansıtmayı Yasakla:** Origin doğrulamasını sunucu taraflı sabit dizi ile yap.
2. **SameSite=Strict + Anti-CSRF Token Çift Katmanı:** Hassas durum değiştiren API'lerde çerez tek başına yetki vermemelidir.
3. **Preflight Doğrulaması:** OPTIONS yanıtında izin verilen header'ları katı tut.

## 5. Doğrulama
```bash
./gap-closure-v2/day-01-browser-lab-v2/test-suite.sh
```

# 6. Variant Analysis
1. Subdomain Takeover: Domain cookie (Domain=example.com) kullanılıyorsa, ele geçirilen alt alan adından ana alan adına CSRF veya Session Hijacking yapılabilir. Çözüm: Host-only çerezler.

CORS Null Origin: file:// veya iframe sandbox içinden atılan isteklerde Origin: null gelebilir. Access-Control-Allow-Origin: null konfigürasyonu ölümcül bir zafiyettir.
