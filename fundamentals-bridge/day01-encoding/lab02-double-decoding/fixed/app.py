from flask import Flask, request, jsonify, abort
from pathlib import PurePosixPath
import posixpath

app = Flask(__name__)

def canonicalize_and_validate(raw_path: str) -> str:
    # 1. Asla tekrar urllib.parse.unquote ÇAĞIRMA (Framework zaten RFC 3986'ya göre decode etti).
    # 2. Path Traversal bileşenlerini POSIX kurallarına göre deterministik normalize et:
    normalized = posixpath.normpath(raw_path)
    
    # 3. Canonical formun boundary dışına çıkmadığını doğrula
    if normalized.startswith('/..') or '..' in normalized.split('/'):
        abort(400, description="Invalid path traversal sequence")
    return normalized

@app.route('/public/<path:subpath>')
def public_view(subpath):
    clean_subpath = canonicalize_and_validate(f"/{subpath}")
    return jsonify({"status": "success", "scope": "public", "path": clean_subpath})

@app.route('/admin')
@app.route('/admin/<path:subpath>')
# subpath parametresi, admin paneline erişim için kullanılacak alt yolları temsil eder. Örneğin, /admin/settings veya /admin/users gibi.
def admin_view(subpath=""):
    # Proxy başlığını veya doğrudan IP trust boundary'sini denetle
    # Sadece localhost'tan gelen isteklere izin ver, çünkü admin paneli kritik işlemler içerir. Bu yuzden X-Forwarded-For başlığına güvenme, çünkü bu başlık kolayca taklit edilebilir. X -Forwarded-For başlığı, genellikle bir proxy veya yük dengeleyici tarafından eklenir ve istemcinin gerçek IP adresini iletmek için kullanılır. Ancak, bu başlık kullanıcı tarafından kolayca değiştirilebilir ve güvenilmez olabilir. Bu nedenle, kritik erişim kontrollerinde yalnızca doğrudan bağlantı IP'sine güvenmek daha güvenlidir. Istek ayni makineden geliyorsa, request.remote_addr değeri '127.0.0.1' veya '::1' olur.
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if client_ip not in ['127.0.0.1', '::1']:
        abort(403, description="Admin access restricted to localhost")
        
    return jsonify({
        "status": "success",
        "scope": "admin",
        "message": "AUTHORIZED_ADMIN_ACCESS",
        "subpath": subpath
    }), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001)
