# Mühendislik Analizi — Lab 03: URL Parser Duality (RFC 3986 vs. WHATWG Living Standard)

## 1. Neden Çalıştı / Neden Engellendi?
* **Neden Çalıştı:** Zafiyetli doğrulama katmanı, RFC 3986 sözdizimine dayanan bir parser kullandı. Ters eğik çizgi (`\`) karakteri RFC standardında authority bitiren bir ayraç olarak zorunlu tutulmadığı için doğrulamada host `trusted-partner.com` olarak değerlendirildi ve kuraldan geçti. Ancak isteği yürüten modern tüketici motor (WHATWG standartlarını izleyen HTTP kütüphanesi veya tarayıcı motoru), özel şemalarda (`http:`, `https:`) ters eğik çizgiyi düz eğik çizgiye (`/`) çevirerek hedef host'u `attacker.com` olarak çözümledi.
* **Neden Engellendi:** Sıkılaştırılmış implementasyonda:
  1. Parser ikiliklerine (duality) neden olan ve RFC ile WHATWG arasında farklı yorumlanan karakterler (`\`, kontrol baytları) doğrudan reddedildi (`PARSER_AMBIGUITY_DETECTED`).
  2. URL tek bir standart formata zorlandı; denetim kanonikleşmiş host üzerinde yürütüldü.

## 2. Root Cause
* **Interpretation Differentials:** İki bağımsız spesifikasyonun (IETF RFC 3986 ve WHATWG URL Standard) aynı dizeyi ayrıştırırken farklı kurallar işletmesi.
* **Trust Boundary Failures:** Güvenlik kararını veren denetleyici kütüphane ile ağ bağlantısını kuran soket kütüphanesinin farklı parser implementasyonları kullanması.

## 3. Platform Davranışları
* **Python `urllib.parse`:** Tarihsel olarak RFC 3986 odaklıdır. Zaman içinde bazı CVE'ler (örn. CVE-2023-24329, CVE-2023-43804) ile normalize kuralları güncellense de, WHATWG ile birebir aynı değildir.
* **Node.js `WHATWG URL` (`new URL()`):** Modern web standartlarına tam uyumludur; `\` karakterini authority sonrası path başlangıcı veya path içi ayraç olarak normalleştirir.
* **cURL (libcurl):** Kendi URL parsing motorunu kullanır. Son sürümlerde WHATWG ile uyumluluk artırılmıştır ancak eski sistemlerde RFC tabanlı kalabilir.

## 4. Kalıcı Savunma (Remediation)
1. **Disallow Ambiguous Delimiters:** URL parametrelerinde `\`, null byte (`\0`), whitespace ve CRLF karakterleri sınırda (boundary) anında 400 ile reddedilmelidir.
2. **Single Engine for Validation & Fetching:** Doğrulama için kullanılan kütüphane ile isteği atan HTTP istemcisi aynı ayrıştırıcı motoru paylaşmalıdır.
3. **Resolve and Pin IP:** SSRF korumalarında yalnızca hostname dizesine güvenilmemeli; hostname güvenli DNS ile çözümlenmeli, IP adresi RFC 1918 / Loopback denetiminden geçirilmeli ve soket doğrudan doğrulanmış IP'ye açılmalıdır (DNS Rebinding ve Parser Duality'yi aynı anda önler).

## 5. Doğrulama
`tests/test-suite.sh` betiği ile RFC vs WHATWG uyuşmazlığının zafiyetli sunucuda SSRF sağladığı, sıkılaştırılmış uç noktada ise 400 koduyla engellendiği otomatik doğrulanmıştır.

## 6. Varyant Analizi
* **SSRF via Userinfo Collision:** `https://user:password@internal.host/` formatının kimi parser'larca kullanıcı adı, kimilerince hedef host olarak ayrıştırılması.
* **Open Redirect via Slash-Backslash Bypass:** `https://target.site/\attacker.site` bağlantısının redirect filtresinden geçip tarayıcıda `attacker.site` adresine yönlenmesi.
