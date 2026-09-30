import unicodedata
import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)
DB_FILE = "vulnerable.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS users")
    cur.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            role TEXT
        )
    """)
    cur.execute("INSERT INTO users (username, role) VALUES ('admin', 'superuser')")
    conn.commit()
    conn.close()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json(force=True)
    username = data.get('username', '')

    # 1. Sözdizimsel Doğrulama (Zayıf: Unicode alfanümerikleri kabul eder)
    # Unicode alfanümerik karakterler, örneğin İ, Ş, Ğ gibi Türkçe karakterler de kabul edilir. Bu da güvenlik riski oluşturabilir.
    if not username.isalnum():
        return jsonify({"status": "error", "message": "Yalnızca alfanümerik karakterler."}), 400

    # 2. Çakışma Kontrolü (HATA: Ham girdi üzerinde sorgulanıyor)
    # Bu kontrol, kullanıcı adının veritabanında zaten var olup olmadığını kontrol eder. Ancak, bu kontrol ham girdi üzerinde yapıldığı için, Unicode normalizasyonu yapılmamış kullanıcı adları arasında çakışmalar olabilir. Örneğin, "user" ve "uſer" (uzun s) gibi farklı Unicode karakterler aynı görünebilir ancak farklı kod noktalarına sahiptir. Bu nedenle, normalizasyon yapılmadan yapılan çakışma kontrolü yanıltıcı olabilir.
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cur.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kullanıcı adı zaten alınmış."}), 409

    # 3. Kanonikleştirme (HATA: Doğrulama ve sorgudan SONRA yapılıyor)
    canonical_username = unicodedata.normalize('NFKC', username)

    # 4. Tüketim / Yazma
    # Veritabanına yazmadan önce, kanonikleştirilmiş kullanıcı adını kullanarak yeni bir kullanıcı oluşturuyoruz. Ancak, bu noktada çakışma kontrolü yapılmadığı için, kanonikleştirilmiş kullanıcı adı zaten veritabanında mevcutsa, UNIQUE constraint ihlali meydana gelebilir ve bu da bir hata veya hizmet reddi durumuna yol açabilir.
    try:
        cur.execute("INSERT INTO users (username, role) VALUES (?, 'user')", (canonical_username,))
        conn.commit()
        user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        # Eğer unique constraint varsa crash / denial-of-service veya çakışma
        return jsonify({"status": "error", "message": "DB_INTEGRITY_COLLISION: Hesap veritabanında çakıştı!"}), 500

    conn.close()
    return jsonify({"status": "success", "user_id": user_id, "username": canonical_username}), 201

if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5010)
