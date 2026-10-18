from flask import Flask, request, jsonify
import hashlib

app = Flask(__name__)

# Sunucu tarafında saklanan gizli anahtar (Saldırgan bunu bilmiyor)
SERVER_SECRET = b"SuperSecretBackendKey123!"

def naive_sign(data: bytes) -> str:
    # HATA: secret + data ham şekilde birleştiriliyor
    return hashlib.sha256(SERVER_SECRET + data).hexdigest()

@app.route('/api/issue-token', methods=['GET'])
def issue_token():
    # Standart misafir token'ı üret
    payload = b"user=guest&role=guest"
    sig = naive_sign(payload)
    return jsonify({
        "payload": payload.decode('latin1'),
        "signature": sig
    })

@app.route('/api/admin-action', methods=['POST'])
def admin_action():
    data = request.get_json(force=True)
    payload_str = data.get("payload", "")
    received_sig = data.get("signature", "")

    payload_bytes = payload_str.encode('latin1')
    expected_sig = naive_sign(payload_bytes)

    # İmza doğrulaması
    if received_sig != expected_sig:
        return jsonify({"status": "error", "message": "INVALID_SIGNATURE"}), 403

    # İş mantığı: Parametreleri ayrıştır (son gelen değer kazanır - last-wins)
    params = {}
    for part in payload_str.split('&'):
        if '=' in part:
            k, v = part.split('=', 1)
            params[k] = v

    if params.get("role") == "admin":
        return jsonify({
            "status": "success",
            "message": "PWNED_ADMIN_ACTION_EXECUTED",
            "effective_role": "admin"
        }), 200

    return jsonify({"status": "success", "message": "Guest action allowed"}), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5070)
