from flask import Flask, request, jsonify
import json

app = Flask(__name__)

def raise_on_duplicate_keys(pairs):
    """
    RFC 8259 belirsizliğini ortadan kaldıran katı obje kancası.
    Yinelenen anahtar tespit edildiğinde ayrıştırmayı anında durdurur.
    """
    obj = {}
    # JSON ayrıştırıcısı, JSON nesnesindeki anahtar-değer çiftlerini bir liste olarak verir. Bu kanca, her anahtarın benzersiz olmasını sağlar ve yinelenen bir anahtar tespit edilirse bir ValueError fırlatır.
    for key, value in pairs:
        if key in obj:
            raise ValueError(f"DUPLICATE_KEY_DETECTED: '{key}' anahtarı birden fazla tanımlanamaz.")
        obj[key] = value
    return obj

def parse_strict_json(raw_body: str):
    return json.loads(raw_body, object_pairs_hook=raise_on_duplicate_keys)

@app.route('/api/users', methods=['POST'])
def create_user():
    raw_body = request.get_data(as_text=True)

    # 1. Katı Ayrıştırma (Strict Parsing)
    try:
        # JSON ayrıştırması sırasında yinelenen anahtarlar tespit edilirse, raise_on_duplicate_keys kancası bir ValueError fırlatır. Bu, saldırganın aynı anahtarı birden fazla kez kullanarak doğrulamayı atlatmasını önler.
        data = parse_strict_json(raw_body)
    except ValueError as ve:
        return jsonify({"status": "error", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Geçersiz JSON formatı."}), 400

    # 2. Yetki ve Rol Doğrulaması (Kanonik ve tekil veri üzerinde)
    requested_role = data.get("role", "user")
    if requested_role == "admin":
        return jsonify({"status": "error", "message": "Admin rolü talep edilemez!"}), 403

    username = data.get("username", "anonymous")

    return jsonify({
        "status": "success",
        "username": username,
        "effective_role": requested_role,
        "message": "User registered successfully"
    }), 201

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5031)
