from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

SERVER_SECRET = b"SuperSecretBackendKey123!"

def secure_hmac_sign(data: bytes) -> str:
    # SAVUNMA: Standart HMAC-SHA256 kullanımı
    return hmac.new(SERVER_SECRET, data, hashlib.sha256).hexdigest()

@app.route('/api/issue-token', methods=['GET'])
def issue_token():
    payload = b"user=guest&role=guest"
    sig = secure_hmac_sign(payload)
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
    expected_sig = secure_hmac_sign(payload_bytes)

    # Sabit zamanlı karşılaştırma (Timing Attack Koruması)
    if not hmac.compare_digest(received_sig, expected_sig):
        return jsonify({"status": "error", "message": "INVALID_SIGNATURE"}), 403

    params = {}
    for part in payload_str.split('&'):
        if '=' in part:
            k, v = part.split('=', 1)
            params[k] = v

    if params.get("role") == "admin":
        return jsonify({
            "status": "success",
            "message": "AUTHORIZED_ADMIN_ACTION_EXECUTED",
            "effective_role": "admin"
        }), 200

    return jsonify({"status": "success", "message": "Guest action allowed"}), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5071)
