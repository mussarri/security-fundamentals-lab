# Vaka Analizi: DOM-based XSS, Source-Sink Analizi ve Güvenli DOM API'leri

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda (`innerHTML`):** `window.location.hash` üzerinden alınan veri hiçbir doğrulama veya kodlama yapılmadan `innerHTML` icra noktasına (sink) yazılmıştır. Tarayıcının HTML ayrıştırıcısı `<img>` etiketini parse edip `onerror` betiğini çalıştırmıştır.
- **Sıkılaştırılmış Durumda (`textContent`):** Girdi bir `Text Node` olarak doğrudan DOM'a eklenmiş; tarayıcı girdiyi markup olarak değil saf karakter dizisi olarak ele almıştır.

## 2. Root Cause
Kullanıcı kontrolündeki kaynaklardan (Source: `location.hash`, `location.search`, `window.name`) okunan verilerin, HTML icra noktalarına (Sink: `innerHTML`, `document.write`, `eval`) filtrelenmeden bağlanması.

## 3. Platform / Tarayıcı Kontrolleri
- Modern framework'ler (React JSX `{value}`, Angular `{{value}}`, Vue `{{value}}`) varsayılan olarak `textContent` benzeri güvenli context encoding kullanır. 
- Güvensiz metodlar (`dangerouslySetInnerHTML`, `v-html`) açıkça çağrılmadıkça DOM XSS'e karşı doğal koruma sağlarlar.

## 4. Remediation (Düzeltme)
1. **Güvenli API'leri Tercih Et:** Dinamik metin eklerken `innerHTML` yerine `textContent` veya `innerText` kullan.
2. **Zorunlu HTML Render Senaryoları (Rich Text):** Kullanıcıdan HTML kabul edilmesi zorunluysa veriyi doğrudan DOM'a basmadan önce **DOMPurify** gibi sanitize kütüphanelerinden geçir:
   ```javascript
   elem.innerHTML = DOMPurify.sanitize(userPayload);
URL Yönlendirmelerinde Doğrulama: location.href = url ataması yapmadan önce protokolün javascript: veya data: olmadığını kontrol et (http: veya https: whitelist'i).

5. Doğrulama
URL hash'i üzerinden zararlı etiketler gönderildiğinde hiçbir betiğin çalışmadığını, girdinin saf metin olarak basıldığını teyit et.

6. Variant Analysis
React uygulamalarında dangerouslySetInnerHTML={{ __html: unescapedData }} kullanımı.

Tek Sayfa Uygulamalarında (SPA) postMessage dinleyicilerinde event.origin kontrolü yapılmadan event.data içeriğinin DOM'a basılması.
