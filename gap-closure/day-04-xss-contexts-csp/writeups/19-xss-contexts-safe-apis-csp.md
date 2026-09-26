# Vaka Analizi: XSS Bağlamları (Contexts), Güvenli API'ler ve CSP Mimarisi

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** `naiveHtmlEscape` fonksiyonu yalnızca `<`, `>`, `&` karakterlerini dönüştürmüştür. Ancak `href` özniteliğine verilen `javascript:alert(1)` girdisi hiçbir HTML etiketi içermediği için bu filtreden hasarsız geçmiş ve kullanıcı linke tıkladığında kod yürütülmüştür. Benzer şekilde JS bağlamında tırnaklar kaçışlanmadığında string dize kırılmıştır.
- **Sıkılaştırılmış Durumda:** 
  1. URL bağlamı için katı bir **Protocol Whitelist** (`http:`, `https:`) uygulanmıştır.
  2. JS bağlamı için `JSON.stringify()` ve `\u003c` normalizasyonu kullanılmıştır.
  3. Derinlemesine savunma olarak dinamik üretilen tek kullanımlık rastgele `nonce` değerine sahip **Content-Security-Policy (CSP)** tanımlanmıştır.

## 2. Root Cause
**Code / Data Separation Failure.** Tarayıcının farklı sözdizimi ayrıştırıcılarına (HTML, JS, URL parser) uygun bağlamsal kaçışlama (context-aware encoding) yapılmaması ve tek tip kaçışlamanın her yerde yeteceği yanılgısı.

## 3. CSP'nin Yeniden Çerçevelenmesi: Birincil Değil, İkincil Savunma
CSP *"XSS Katili"* değildir. CSP, kodlama hatası yapıldığında zararı sınırlamaya yarayan ikincil bir güvenlik ağıdır (Safety Net):
$$\text{Birincil Savunma (Primary): Safe APIs (textContent) + Context-Aware Escaping}$$
$$\text{İkincil Savunma (Defense-in-Depth): Strict Nonce-based CSP}$$

### Temel CSP Direktifleri
- `script-src 'nonce-{RANDOM}' 'strict-dynamic'`: Yalnızca sunucunun onayladığı scriptlerin çalışmasını sağlar; satır içi `<script>alert(1)</script>` enjeksiyonlarını durdurur.
- `object-src 'none'`: Flash, Java applet gibi eski ve güvensiz plugin injection vektörlerini kapatır.
- `base-uri 'none'`: `<base href="...">` manipülasyonu ile göreceli script yollarının saldırgan sunucusuna saptırılmasını engeller.
- `frame-ancestors 'none'`: Sitenin iframe içine alınarak Clickjacking yapılmasını tarayıcı düzeyinde kilitler.

## 4. Remediation (Düzeltme Adımları)
1. HTML Body için: `element.textContent` kullan (`innerHTML` yasakla).
2. URL / Link için: Protokolü ayrıştır (`URL.protocol`), yalnızca `http:` ve `https:` izin ver.
3. JS Değişkenleri için: HTML'e gömmek yerine ayrı bir `data-*` attribute veya `/api/data` JSON uç noktası kullan.
4. CSP Tanımla: Statik domain whitelist'leri yerine Nonce veya Hash tabanlı modern CSP politikası uygula.
