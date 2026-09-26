# Vaka Analizi: Tarayıcı Güvenliği, CORS Misconfigurations ve Çerez Semantiği

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** API, istemciden gelen `Origin` başlığını doğrulamadan doğrudan `Access-Control-Allow-Origin: <Origin>` olarak yansıtmış ve üzerine `Access-Control-Allow-Credentials: true` başlığı eklemiştir. Bu durum, kurban `http://localhost:3018` adresindeyken tarayıcının kurbanın oturum çerezlerini kullanarak hassas verileri saldırganın JavaScript koduna teslim etmesine yol açmıştır.
- **Sıkılaştırılmış Durumda:** Sunucu tarafında katı bir Origin Allowlist tanımlanmış, preflight (`OPTIONS`) istekleri denetlenmiş ve izinsiz kökenler `403 Forbidden` ile reddedilmiştir.

## 2. Root Cause
Tarayıcının **Same-Origin Policy (SOP)** kuralının yetkisiz şekilde gevşetilmesi ve `Origin` HTTP başlığının güvenilmeyen istemci girdisi olarak doğrulanmaması (**Trust Boundary Failure**).

## 3. Çerez (Cookie) Taksonomisi ve Güvenlik Etkileri
- **Host-only vs. Domain Cookie:** 
  - `Set-Cookie: token=xyz; Path=/` $\to$ **Host-only**. Yalnızca `api.example.com`'a gider, alt alan adlarına (`evil.api.example.com`) gitmez.
  - `Set-Cookie: token=xyz; Domain=example.com` $\to$ **Domain Cookie**. Tüm subdomain'lere sızar; subdomain takeover zafiyetlerinde oturum çalınmasına neden olur.
- **SameSite Mekanizması:**
  - `Strict`: Üçüncü taraf link tıklamalarında dahi çerez gitmez.
  - `Lax`: Üst düzey GET navigasyonlarında gider; `POST`, `fetch`, `iframe` gibi çapraz kökenli isteklerde gitmez.
  - `None`: Her durumda gider (Zorunlu olarak `Secure` bayrağı gerektirir).

## 4. Remediation (Düzeltme Adımları)
1. **Dinamik Origin Yansıtmayı Yasakla:** `Access-Control-Allow-Origin: req.headers.origin` yazımından kesinlikle kaçın.
2. **`*` ve Credentials Uyuşmazlığı:** `Access-Control-Allow-Origin: *` ile `Access-Control-Allow-Credentials: true` aynı anda kullanılamaz; tarayıcı bu yanıtı güvenlik gereği engeller.
3. **Preflight Cache:** `Access-Control-Max-Age` ile onaylanmış preflight isteklerini önbelleğe alarak gereksiz ağ trafiğini azalt.
