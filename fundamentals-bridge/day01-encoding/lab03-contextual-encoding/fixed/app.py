from flask import Flask, request, render_template_string, abort
import html
from urllib.parse import urlparse

app = Flask(__name__)

SAFE_HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><title>Sıkılaştırılmış Profil Bağlantısı</title></head>
<body>
    <h2>Kullanıcı Web Sitesi</h2>
    <p>Bağlantınız: <a id="user-link" href="{{ safe_url }}">Kullanıcı Profili</a></p>
</body>
</html>
"""

def sanitize_and_validate_url(raw_url: str) -> str:
    # ADIM 1: Girdiyi decode edip parse etmek (Kanonikleştirme)
    # Tarayıcının HTML parser'ının yapacağını simüle ederek önce entity'leri çöz:
    # Bu adım, kullanıcı tarafından sağlanan URL'deki HTML entity'lerini çözerek, potansiyel olarak zararlı karakterlerin etkisiz hale getirilmesini sağlar. Örneğin, '&lt;' gibi entity'ler '<' karakterine dönüştürülür. Bu, kullanıcı tarafından sağlanan URL'nin doğru bir şekilde işlenmesini ve güvenli bir şekilde kullanılmasını sağlar.
    unescaped = html.unescape(raw_url).strip()
    
    # ADIM 2: RFC standartlarına göre URL parse et ve Şema ALLOWLIST uygula
    # Bu adım, kullanıcı tarafından sağlanan URL'yi RFC standartlarına göre parse ederek, URL'nin bileşenlerini (şema, host, path vb.) ayrıştırır. Ardından, sadece belirli güvenli şemalara (http ve https) izin verilir. Bu, potansiyel olarak zararlı şemaların (örneğin, javascript: veya data:) kullanılmasını engeller ve kullanıcı tarafından sağlanan URL'nin güvenli bir şekilde işlenmesini sağlar. urlparse fonksiyonu, URL'yi bileşenlerine ayırarak, şema, host, path ve diğer bileşenleri elde eder. Bu sayede, kullanıcı tarafından sağlanan URL'nin güvenli olup olmadığını kontrol etmek için gerekli bilgiler elde edilir.
    parsed = urlparse(unescaped)
    
    # Sadece güvenli protokollere izin ver (Kesinlikle 'javascript:' veya 'data:' geçemez)
    # parsed.scheme, URL'nin şema bileşenini temsil eder. Bu adımda, sadece 'http' ve 'https' şemalarına izin verilir. Eğer kullanıcı tarafından sağlanan URL'nin şeması bu iki şemadan biri değilse, URL geçersiz olarak kabul edilir ve "#invalid-scheme" döndürülür. Bu, potansiyel olarak zararlı şemaların kullanılmasını engeller ve kullanıcı tarafından sağlanan URL'nin güvenli bir şekilde işlenmesini sağlar.
    if parsed.scheme not in ['http', 'https']:
        # Şema yoksa veya izin verilmeyen bir şemaysa fallback uygula
        return "#invalid-scheme"
    
    # Netloc (host) doğrulaması
    # parsed.netloc, URL'nin host bileşenini temsil eder. Bu adımda, URL'nin geçerli bir host içerip içermediği kontrol edilir. Eğer URL geçerli bir host içermiyorsa, URL geçersiz olarak kabul edilir ve "#invalid-host" döndürülür. Bu, potansiyel olarak zararlı veya eksik URL'lerin kullanılmasını engeller ve kullanıcı tarafından sağlanan URL'nin güvenli bir şekilde işlenmesini sağlar. ornegin url parse('http:///path') = ParseResult(scheme='http', netloc='', path='/path', params='', query='', fragment='') olur. netloc bos oldugu icin #invalid-host doner. ama url parse('http://example.com/path') = ParseResult(scheme='http', netloc='example.com', path='/path', params='', query='', fragment='') olur. netloc dolu oldugu icin gecerlidir.
    if not parsed.netloc:
        return "#invalid-host"
        
    # ADIM 3: Contextual Encoding (HTML Attribute bağlamı için güvenli escape)
    # Güvenli URL Jinja2 veya html.escape ile HTML entity formatına sokulur.
    # Bu adım, kullanıcı tarafından sağlanan URL'yi HTML attribute bağlamında güvenli bir şekilde escape ederek, potansiyel olarak zararlı karakterlerin etkisiz hale getirilmesini sağlar. html.escape fonksiyonu, URL'deki özel karakterleri (örn. <, >, &, ") HTML entity'lerine dönüştürerek, XSS saldırılarına karşı koruma sağlar. Bu sayede, kullanıcı tarafından sağlanan URL'nin güvenli bir şekilde HTML içinde kullanılmasını sağlar. Orneğin, kullanıcı tarafından sağlanan URL "http://example.com/?q=<script>alert('XSS')</script>" ise, html.escape fonksiyonu bu URL'yi "http://example.com/?q=&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;" olarak escape eder. Bu sayede, URL HTML içinde kullanıldığında, zararlı script çalıştırılamaz ve XSS saldırısı engellenir.  
    return html.escape(unescaped, quote=True)

@app.route('/profile')
def profile():
    website = request.args.get('website', 'https://example.com')
    # ADIM 4: URL'yi sanitize et ve güvenli hale getir
    # Ornekler: sanitize_and_validate_url('http://example.com') = 'http://example.com'
    # sanitize_and_validate_url('javascript:alert(1)') = '#invalid-scheme'
    # sanitize_and_validate_url('http:///path') = '#invalid-host'
    # sanitize_and_validate_url('http://example.com/?q=<script>alert(1)</script>') = 'http://example.com/?q=&lt;script&gt;alert(&#x27;1&#x27;)&lt;/script&gt;'
    safe_website = sanitize_and_validate_url(website)
    
    return render_template_string(SAFE_HTML_TEMPLATE, safe_url=safe_website)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5021)
