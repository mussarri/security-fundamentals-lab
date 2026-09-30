# Contextual Encoding & Browser Execution Order

Tarayıcı `href`, `src` gibi URL bekleyen HTML attribute'larını ayrıştırırken belirli bir yürütme sırası takip eder:

[ Ham HTML Metni ]
↓

HTML Parser Katmanı

&quot;, &#x3a;, &#58; gibi HTML entity'lerini çözer.

Sonuç: javascript:... şeması açığa çıkar.
↓

URL Parser Katmanı

Şemayı (protocol) denetler (javascript:, data:, http:).

Scheme sonrası kısımdaki %XX URL decode işlemlerini yapar.
↓

JavaScript Engine Katmanı

Eğer scheme javascript: ise kalan string'i JavaScript kodu olarak çalıştırır.

JS escape karakterlerini (\u0061, \x28) bu aşamada çözer.


Eğer filtre katmanı yalnızca `javascript:` kelimesini regex ile arar ancak HTML entity decode yapmazsa:
- Saldırgan `&#x6a;avascript:...` gönderir.
- WAF/Filtre bunu zararsız metin sanıp geçirir.
- Tarayıcı HTML Parser aşamasında `&#x6a;` -> `j` yapar ve `javascript:` protokolünü tetikler.
