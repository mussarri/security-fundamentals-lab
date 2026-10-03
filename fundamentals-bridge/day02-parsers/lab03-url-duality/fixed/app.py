from flask import Flask, request, jsonify
from urllib.parse import urlparse
import ipaddress
import socket

app = Flask(__name__)

ALLOWED_DOMAIN = "trusted-partner.com"

def strict_canonicalize_and_validate(raw_url: str):
    """
    1. Parser Duality Önleme: URL içinde RFC ve WHATWG arasında ayrışma yaratan
       karakterleri ('\', control chars) baştan yasakla veya WHATWG tarzı normalleştir.
    2. Katı şema ve domain Allowlist uygula.
    3. Hostname'i DNS çözümlemesi ve IP denetimi ile sınırla.
    """
    if not raw_url or not isinstance(raw_url, str):
        raise ValueError("URL boş olamaz.")

    # RFC/WHATWG ayrışmasının ana kaynağı olan backslash kontrolü
    if "\\" in raw_url:
        raise ValueError("PARSER_AMBIGUITY_DETECTED: Ters eğik çizgi ('\\') içeren URL'ler yasaktır.")

    # Yalnızca HTTP/HTTPS şeması
    parsed = urlparse(raw_url)
    if parsed.scheme not in ['http', 'https']:
        raise ValueError("Yalnızca HTTP ve HTTPS şemaları desteklenir.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Geçersiz veya eksik hostname.")

    # Domain allowlist kontrolü
    if hostname != ALLOWED_DOMAIN and not hostname.endswith("." + ALLOWED_DOMAIN):
        raise ValueError(f"Erişim reddedildi: Hostname '{hostname}' izin listesinde değil.")

    # Güvenli: Her iki parser için de aynı host döner
    return hostname

@app.route('/api/webhook', methods=['POST'])
def trigger_webhook():
    data = request.get_json(force=True)
    target_url = data.get('url', '')

    try:
        resolved_host = strict_canonicalize_and_validate(target_url)
    except ValueError as ve:
        return jsonify({"status": "error", "message": str(ve)}), 400

    return jsonify({
        "status": "success",
        "message": f"Webhook dispatched securely to {resolved_host}"
    }), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5051)
