from flask import Flask, request, jsonify
import urllib.parse
import sqlite3
import re

app = Flask(__name__)
DB_FILE = "fixed.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS products")
    cur.execute("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT)")
    cur.execute("INSERT INTO products (name, category) VALUES ('Laptop', 'electronics')")
    cur.execute("INSERT INTO products (name, category) VALUES ('Flag_Day2_Bypass', 'confidential')")
    conn.commit()
    conn.close()

@app.route('/api/search', methods=['GET'])
def search_products():
    raw_category = request.args.get('category', '')

    # ADIM 1: Önce Kanonikleştirme / Decode
    # Girdiyi nihai semantik haline getir
    # Ornegin %2F gibi URL encoded karakterleri decode et, ve baştaki/sondaki boşlukları temizle
    # Mesela "%2Fconfidential%2F" -> "/confidential/" -> "confidential"
    # urllib.parse.unquote ile URL decode işlemi yapılır, ardından strip() ile baştaki ve sondaki boşluklar temizlenir.
    canonical_category = urllib.parse.unquote(raw_category).strip()

    # ADIM 2: Decode Edilmiş Veri Üzerinde Doğrulama (Allowlist Regex)
    # Yalnızca alfanümerik kategori isimlerine izin ver
    if not re.match(r'^[a-zA-Z0-9_\-]{1,50}$', canonical_category):
        return jsonify({
            "status": "error",
            "message": "INVALID_INPUT: Kategori yalnızca alfanümerik karakterler içerebilir."
        }), 400

    # ADIM 3: Parameterized Query ile Güvenli Tüketim
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT name FROM products WHERE category = ?", (canonical_category,))
    results = [row[0] for row in cur.fetchall()]
    conn.close()

    return jsonify({"status": "success", "results": results}), 200

if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5041)
