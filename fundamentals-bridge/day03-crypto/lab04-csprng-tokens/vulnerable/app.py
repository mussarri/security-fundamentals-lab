from flask import Flask, request, jsonify
import random
import time

app = Flask(__name__)

# Simüle edilen kullanıcı veritabanı
RESET_TOKENS = {}

@app.route('/api/request-reset', methods=['POST'])
def request_reset():
    data = request.get_json(force=True)
    email = data.get('email', '')

    # HATA 1: Zaman tabanlı deterministik seed ataması
    # HATA 2: Standart PRNG (random) kullanımı
    current_timestamp = int(time.time())
    random.seed(current_timestamp) # random.seed zaman tabanlı deterministik bir seed ile başlatılıyor, bu da tahmin edilebilir token üretimine yol açar.
   
    # 6 basamaklı veya zayıf rastgele hex token üretimi
    token = f"{random.getrandbits(32):08x}"
    RESET_TOKENS[token] = email

    return jsonify({
        "status": "success",
        "message": "Sıfırlama token'ı oluşturuldu (E-posta gönderildi varsayımı).",
        "timestamp_hint": current_timestamp
    }), 200

@app.route('/api/confirm-reset', methods=['POST'])
def confirm_reset():
    data = request.get_json(force=True)
    token = data.get('token', '')

    if token in RESET_TOKENS:
        user_email = RESET_TOKENS.pop(token)
        return jsonify({
            "status": "success",
            "message": "CRITICAL_TOKEN_VERIFIED_ACCOUNT_COMPROMISED",
            "user": user_email
        }), 200

    return jsonify({"status": "error", "message": "Geçersiz veya süresi dolmuş token"}), 403

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5090)
