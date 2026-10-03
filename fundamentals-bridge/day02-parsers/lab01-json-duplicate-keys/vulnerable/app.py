from flask import Flask, request, jsonify
import json
import re

app = Flask(__name__)

def gateway_validate_role_first_key_wins(raw_body: str) -> str:
    """
    API Gateway / WAF denetimini simüle eder.
    Birçok akış ayrıştırıcısı veya zayıf WAF motoru dizede karşılaştığı
    İLK eşleşmeyi esas alır (first-key-wins).
    """
    match = re.search(r'"role"\s*:\s*"([^"]+)"', raw_body) 
    # Bu regex, JSON dizesinde "role" anahtarının ilk değerini yakalar. Ancak bu yaklaşım, JSON'da tekrar eden anahtarlar varsa sadece ilkini döndürür. Saldırgan, JSON'da birden fazla "role" anahtarı göndererek bu doğrulamayı atlatabilir.
    if match:
        return match.group(1)
    return "user"

@app.route('/api/users', methods=['POST'])
def create_user():
    # Kullanıcıdan gelen ham JSON verisini al
    raw_body = request.get_data(as_text=True)

    # 1. Gateway Seviyesi Doğrulama
    # Bu doğrulama, yalnızca JSON dizesinde ilk "role" anahtarının değerini kontrol eder. Eğer ilk "role" değeri "admin" ise, istek reddedilir. Ancak, saldırgan ikinci bir "role" anahtarı ekleyerek bu doğrulamayı atlatabilir.
    validated_role = gateway_validate_role_first_key_wins(raw_body)
    if validated_role == "admin":
        return jsonify({"status": "error", "message": "Gateway: Admin rolü talep edilemez!"}), 403

    # 2. Backend Tüketimi (Python json.loads - Last-key-wins davranışı)
    try:
        data = json.loads(raw_body)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Malformed JSON: {str(e)}"}), 400

    username = data.get("username", "anonymous")
    assigned_role = data.get("role", "user")

    # Kullanıcı oluşturulur
    return jsonify({
        "status": "success",
        "username": username,
        "effective_role": assigned_role,
        "message": "User registered successfully"
    }), 201

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5030)
