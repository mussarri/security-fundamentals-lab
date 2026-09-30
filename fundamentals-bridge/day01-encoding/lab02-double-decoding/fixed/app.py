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
def admin_view(subpath=""):
    # Proxy başlığını veya doğrudan IP trust boundary'sini denetle
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
