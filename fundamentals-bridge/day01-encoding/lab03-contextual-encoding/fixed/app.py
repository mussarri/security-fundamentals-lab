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
    unescaped = html.unescape(raw_url).strip()
    
    # ADIM 2: RFC standartlarına göre URL parse et ve Şema ALLOWLIST uygula
    parsed = urlparse(unescaped)
    
    # Sadece güvenli protokollere izin ver (Kesinlikle 'javascript:' veya 'data:' geçemez)
    if parsed.scheme not in ['http', 'https']:
        # Şema yoksa veya izin verilmeyen bir şemaysa fallback uygula
        return "#invalid-scheme"
    
    # Netloc (host) doğrulaması
    if not parsed.netloc:
        return "#invalid-host"
        
    # ADIM 3: Contextual Encoding (HTML Attribute bağlamı için güvenli escape)
    # Güvenli URL Jinja2 veya html.escape ile HTML entity formatına sokulur.
    return html.escape(unescaped, quote=True)

@app.route('/profile')
def profile():
    website = request.args.get('website', 'https://example.com')
    safe_website = sanitize_and_validate_url(website)
    return render_template_string(SAFE_HTML_TEMPLATE, safe_url=safe_website)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5021)
