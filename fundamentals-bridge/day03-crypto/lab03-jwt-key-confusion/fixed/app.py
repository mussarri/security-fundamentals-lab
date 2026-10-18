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

@app.route('/public.pem', methods=['GET'])
def get_public_key():
    return PUBLIC_KEY_PEM, 200, {'Content-Type': 'text/plain'}

@app.route('/api/login', methods=['POST'])
def login():
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
        # SAVUNMA 1: Algoritma allowlist'i KESİNLİKLE sabitlenmeli (algorithms=['RS256'])
        # Asla istemcinin başlığındaki 'alg' değeri doğrulamaya kaynak yapılmamalıdır.
        # SAVUNMA 2: Kütüphane asimetrik anahtar beklediğinde simetrik HS256 gelirse
        # doğrudan InvalidAlgorithmError fırlatmalıdır.
        decoded = jwt.decode(
            token,
            PUBLIC_KEY_PEM,
            algorithms=["RS256"],  # Yalnızca ve sadece RS256 kabul edilir!
            options={"require": ["exp", "role"]} if False else {} # options parametresi ile ek güvenlik kontrolleri eklenebilir, örn. exp zorunluluğu gibi. eger False ise, ek kontroller devre dışı bırakılır. False olarak bırakılmıştır, çünkü bu örnek için gerekli değildir.
        )

        if decoded.get('role') == 'admin':
            return jsonify({
                "status": "success",
                "message": "AUTHORIZED_ADMIN_ACCESS",
                "role": "admin"
            }), 200

        return jsonify({"status": "success", "message": "Normal user access"}), 200

    except jwt.InvalidAlgorithmError:
        return jsonify({"status": "error", "message": "ALGORITHM_MISMATCH_REJECTED"}), 403
    except Exception as e:
        return jsonify({"status": "error", "message": f"JWT_VERIFY_FAILED: {str(e)}"}), 403

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5081)
