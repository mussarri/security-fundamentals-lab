from flask import Flask, request, jsonify
import secrets
import hmac

app = Flask(__name__)

RESET_TOKENS = {}

@app.route('/api/request-reset', methods=['POST'])
def request_reset():
    data = request.get_json(force=True)
    email = data.get('email', '')

    # SAVUNMA: İşletim sistemi CSPRNG havuzunu kullanan secrets modülü
    # 32 bayt (256-bit) yüksek entropili URL-safe token
    token = secrets.token_urlsafe(32)
    RESET_TOKENS[token] = email

    return jsonify({
        "status": "success",
        "message": "Sıfırlama bağlantısı iletildi."
    }), 200

@app.route('/api/confirm-reset', methods=['POST'])
def confirm_reset():
    data = request.get_json(force=True)
    token = data.get('token', '')

    # Sabit zamanlı sorgulama ve token tüketimi
    matched_token = None
    for stored_token in list(RESET_TOKENS.keys()):
        if hmac.compare_digest(stored_token, token): 
            matched_token = stored_token
            break


    # Sabit zamanlı token doğrulaması ve tüketimi, eger eşleşen token bulunursa, kullanıcı e-posta adresi ile birlikte başarılı yanıt döndürülür.        
    if matched_token:
        user_email = RESET_TOKENS.pop(matched_token) # Token tüketimi (tek kullanımlık)
        return jsonify({
            "status": "success",
            "message": "AUTHORIZED_TOKEN_VERIFIED",
            "user": user_email
        }), 200

    return jsonify({"status": "error", "message": "Geçersiz token"}), 403

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5091)
