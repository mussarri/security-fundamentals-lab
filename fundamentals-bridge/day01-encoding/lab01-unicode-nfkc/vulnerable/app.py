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
    # Bu doğrulama, kullanıcı adının sadece alfanümerik karakterler içerip içermediğini kontrol eder. Ancak, Unicode karakterleri de kabul ettiği için güvenlik açısından zayıftır. yani 
    if not username.isalnum():
        return jsonify({"status": "error", "message": "Yalnızca alfanümerik karakterler."}), 400

    # 2. Çakışma Kontrolü (HATA: Ham girdi üzerinde sorgulanıyor)
    # Bu adımda, kullanıcı adı veritabanında zaten mevcut olup olmadığını kontrol ediyoruz. Ancak, bu kontrol ham girdi üzerinde yapıldığı için, Unicode karakterlerin farklı görünümleri nedeniyle çakışmalar gözden kaçabilir. Mesela 'café' ve 'cafe' aynı görünümde olabilir ama farklı Unicode karakterleri kullanır.
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cur.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kullanıcı adı zaten alınmış."}), 409

    # 3. Kanonikleştirme (HATA: Doğrulama ve sorgudan SONRA yapılıyor)
    # Bu adımda, kullanıcı adını Unicode Normalization Form KC (NFKC) kullanarak kanonikleştiriyoruz. Ancak, bu işlem doğrulama ve çakışma kontrolünden sonra yapıldığı için, kullanıcı adı veritabanında zaten mevcut olabilir ve bu durum gözden kaçabilir. Örneğin, 'café' ve 'cafe' aynı görünüme sahip olabilir ama farklı Unicode karakterleri kullanır. Canonicallestirme sonrasi , bu iki kullanıcı adı aynı hale gelir ve çakışma meydana gelir.
    canonical_username = unicodedata.normalize('NFKC', username)

    # 4. Tüketim / Yazma
    # Bu adımda, kanonikleştirilmiş kullanıcı adını veritabanına ekliyoruz. Ancak, bu işlem sırasında bir çakışma meydana gelirse, IntegrityError yakalanır ve uygun bir hata mesajı döndürülür. Bu, kullanıcı adı veritabanında zaten mevcutsa veya başka bir çakışma varsa meydana gelebilir.
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
