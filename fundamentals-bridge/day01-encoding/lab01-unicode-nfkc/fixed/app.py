import unicodedata
import sqlite3
import re
from flask import Flask, request, jsonify

app = Flask(__name__)
DB_FILE = "fixed.db"

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

def canonicalize_username(raw_username: str) -> str:
    # 1. Önce Kanonikleştirme: Compatibility Decomposition -> Canonical Composition
    normalized = unicodedata.normalize('NFKC', raw_username)
    # 2. Case Folding (Unicode standardına uygun küçük harfe indirgeme)
    folded = normalized.casefold()
    return folded

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json(force=True)
    raw_username = data.get('username', '')

    # ADIM 1: Her şeyden önce kanonikleştir
    canonical_username = canonicalize_username(raw_username)

    # ADIM 2: Katı Sözdizimsel Doğrulama (Sadece güvenli ASCII alfanümerik karakterler)
    if not re.match(r'^[a-z0-9_]{3,30}$', canonical_username):
        return jsonify({
            "status": "error",
            "message": "Kullanıcı adı 3-30 karakter arası ASCII alfanümerik veya alt çizgi olmalıdır."
        }), 400

    # ADIM 3: Çakışma Kontrolü (Kanonik değer üzerinden)
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ?", (canonical_username,))
    if cur.fetchone():
        conn.close()
        return jsonify({"status": "error", "message": "Bu kullanıcı adı zaten alınmış."}), 409

    # ADIM 4: Tüketim / Güvenli Kayıt
    try:
        cur.execute("INSERT INTO users (username, role) VALUES (?, 'user')", (canonical_username,))
        conn.commit()
        user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"status": "error", "message": "Kullanıcı adı zaten kullanımda."}), 409

    conn.close()
    return jsonify({"status": "success", "user_id": user_id, "username": canonical_username}), 201

if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5011)
