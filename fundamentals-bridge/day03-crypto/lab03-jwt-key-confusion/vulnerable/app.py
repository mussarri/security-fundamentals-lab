from flask import Flask, request, jsonify
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

app = Flask(__name__)

# Sunucu başlangıcında RSA Anahtar Çifti Üretimi
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

PRIVATE_KEY_PEM = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
).decode('utf-8')

PUBLIC_KEY_PEM = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode('utf-8')

@app.route('/.well-known/jwks.json', methods=['GET'])
@app.route('/public.pem', methods=['GET'])
def get_public_key():
    # Genel Anahtar herkese açıktır,  
    return PUBLIC_KEY_PEM, 200, {'Content-Type': 'text/plain'}

@app.route('/api/login', methods=['POST'])
def login():
    # Meşru token üretimi (RS256 ve Private Key ile), 
    token = jwt.encode(
        {"user": "guest", "role": "user"},
        PRIVATE_KEY_PEM,
        algorithm="RS256"
    )
    return jsonify({"token": token})

@app.route('/api/admin-dashboard', methods=['GET'])
def admin_dashboard():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        return jsonify({"status": "error", "message": "Missing token"}), 401

    token = auth_header.split(" ")[1]

    try:
        # HATA 1: algorithms parametresi belirtilmemiş veya hem RS hem HS kabul ediyor!
        # HATA 2: PyJWT kütüphanesinin eski sürümlerinde veya esnek parametrelerde
        # anahtar türü denetlenmeden başlığa göre HS256 ile public key'i HMAC secret gibi kullanır.
        # Burada algoritma kısıtı koymadan public key ile decode simüle ediliyor:
        # ornek olarak, token başlığında "alg": "HS256" olarak belirtilirse, kütüphane public key'i HMAC secret gibi kullanır ve token doğrulaması geçebilir.
        unverified_header = jwt.get_unverified_header(token)
        chosen_alg = unverified_header.get('alg')


        if chosen_alg == "none":
            return jsonify({"status": "error", "message": "Algorithm none rejected"}), 400

        # Algoritma zorlaması yok; gelen alg neyse o kütüphaneye geçiriliyor, bu da güvenlik riski oluşturur.
        decoded = jwt.decode(token, PUBLIC_KEY_PEM, algorithms=[chosen_alg])
        
        if decoded.get('role') == 'admin':
            return jsonify({
                "status": "success",
                "message": "CRITICAL_KEY_CONFUSION_EXPLOIT_SUCCESSFUL",
                "role": "admin"
            }), 200

        return jsonify({"status": "success", "message": "Normal user access"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"JWT_VERIFY_FAILED: {str(e)}"}), 403

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5080)
