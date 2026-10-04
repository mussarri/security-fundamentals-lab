from flask import Flask, request, jsonify
from urllib.parse import urlparse
import re

app = Flask(__name__)

ALLOWED_DOMAIN = "trusted-partner.com"

def naive_url_validator(raw_url: str) -> bool:
    """
    HATA: Python'ın standart urllib.parse (RFC 3986 tabanlı) motorunu kullanır.
    Ters eğik çizgi ('\') durumunda WHATWG ile ayrışır.
    """
    try:
        # urllib.parse RFC 3986 yaklaşımı sergiler
        # URL'yi ayrıştırır ve hostname'i alır, ornegin "https://trusted-partner.com/api" -> "trusted-partner.com", "\\trusted-partner.com" -> None
        # Bu nedenle ters eğik çizgi içeren URL'ler WHATWG ile farklı davranır. saldirganlar bunu kullanabilir. mesela "https://trusted-partner.com\\evil.com" -> WHATWG: "evil.com", RFC: "trusted-partner.com" 
        # Bu nedenle URL doğrulama için RFC 3986 standardını kullanmak güvenli değildir.
        parsed = urlparse(raw_url)
        hostname = parsed.hostname
        if not hostname:
            return False
        
        # Sadece izin verilen alan adı veya alt alan adları kabul edilir
        if hostname == ALLOWED_DOMAIN or hostname.endswith("." + ALLOWED_DOMAIN):
            return True
        return False
    except Exception:
        return False

def simulate_whatwg_consumer(raw_url: str) -> str:
    """
    WHATWG standartlarını uygulayan modern bir istemciyi (Node.js URL, Chrome) simüle eder.
    WHATWG kuralı: Special scheme (https:) durumunda '\' karakterleri '/' yapılır.
    """
    # WHATWG normalizasyonu: http/https şemalarında '\' karakterleri '/' yapılır
    normalized = raw_url
    
    if normalized.startswith("http://") or normalized.startswith("https://"):
        scheme, rest = normalized.split("://", 1)
        # Authority ve path içindeki backslash'ler slash'e dönüşür
        normalized = scheme + "://" + rest.replace("\\", "/")

    # Normalize edilmiş URL üzerinden authority çıkarımı, host'u alır. Orneğin "https://trusted-partner.com/evil" -> "trusted-partner.com", "https://trusted-partner.com\\evil.com" -> "evil.com"
    match = re.search(r'https?://([^/@:]+)', normalized)
    if match:
        return match.group(1)
    return "UNKNOWN_HOST"

@app.route('/api/webhook', methods=['POST'])
def trigger_webhook():
    data = request.get_json(force=True)
    target_url = data.get('url', '')

    # 1. Doğrulama Katmanı (Validator - RFC 3986 mantığı)
    # HATA: RFC 3986 tabanlı naive_url_validator, WHATWG ile farklı davranır. Bu nedenle ters eğik çizgi içeren URL'ler saldırganlar tarafından kullanılabilir.
    if not naive_url_validator(target_url):
        return jsonify({
            "status": "error",
            "message": "SECURITY_ERROR: URL trusted-partner.com domainine ait olmalıdır!"
        }), 403

    # 2. Tüketim Katmanı (Consumer - WHATWG istemci davranışı)
    # WHATWG standardına göre URL ayrıştırması yapılır ve host çözülür. orneğin "https://trusted-partner.com\\evil.com" -> WHATWG: "evil.com", RFC: "trusted-partner.com"
    # ornegin burda girdi "\\trusted-partner.com" -> WHATWG: "trusted-partner.com", RFC: None, trusted-partner.com domainine ait oldugu icin validator onaylar, consumer ise WHATWG ile ayrıştırır ve saldırgan hosta gider. Bu bir SSRF açığıdır.
    resolved_host = simulate_whatwg_consumer(target_url)

    # Eğer consumer izin verilmeyen bir host'a gittiyse SSRF tetiklenmiştir
    if resolved_host != ALLOWED_DOMAIN and not resolved_host.endswith("." + ALLOWED_DOMAIN):
        return jsonify({
            "status": "exploited",
            "message": "SSRF_TRIGGERED: Validator RFC ile onayladı, Consumer WHATWG ile saldırgan hosta gitti!",
            "consumer_connected_to": resolved_host
        }), 200

    return jsonify({
        "status": "success",
        "message": f"Webhook dispatched successfully to {resolved_host}"
    }), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5050)
