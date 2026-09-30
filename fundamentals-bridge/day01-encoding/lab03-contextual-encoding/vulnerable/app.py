from flask import Flask, request, render_template_string
import re

app = Flask(__name__)

# Güvensiz Şablon: Filtreleme yanlış bağlamda (yalnızca ham string'de) yapılıyor.
# URL şeması allowlist'e dayanmıyor, sadece basit blacklist uygulanıyor.
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><title>Zafiyetli Profil Bağlantısı</title></head>
<body>
    <h2>Kullanıcı Web Sitesi</h2>
    <!-- Geliştirici buraya gelen linki doğrudan basıyor -->
    <p>Bağlantınız: <a id="user-link" href="{{ website_url }}">Kullanıcı Profili</a></p>
</body>
</html>
"""

def unsafe_filter(url: str) -> str:
    # HATA 1: Yalnızca düz metinde 'javascript:' veya 'data:' arıyor.
    # HTML Entity ayrıştırmasını hesaba katmıyor.
    # HATA 2: Blacklist yaklaşımı kullanıyor.
    lowered = url.lower()
    if lowered.startswith("javascript:") or lowered.startswith("data:"):
        return "#blocked"
    return url

@app.route('/profile')
def profile():
    website = request.args.get('website', 'https://example.com')
    filtered_website = unsafe_filter(website)
    # Jinja2 varsayılan olarak HTML escaping yapar ancak `href="{{ website_url }}"`
    # bağlamında '&#x6a;...' gibi zaten entity olan girdiler korunabilir
    # veya geliştirici autoescape'i devre dışı bırakmış olabilir.
    # Burada bağlamsal ayrıştırmayı simüle etmek için doğrudan şablon render ediliyor:
    return render_template_string(HTML_TEMPLATE, website_url=filtered_website)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5020)
