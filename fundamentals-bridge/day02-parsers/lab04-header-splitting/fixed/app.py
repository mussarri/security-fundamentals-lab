import socket
import threading
import re

def validate_header_value(val: str) -> str:
    """
    RFC 9112 / RFC 7230 gereğince:
    Başlık değerleri kontrol karakterleri (\r, \n, \0) veya tanımsız ayraçlar içeremez.
    """
    # 1. Her türlü satır sonu ve kontrol karakterini baştan reddet
    # CRLF enjeksiyonunu önlemek için, başlık değerinde satır sonu veya kontrol karakteri bulunmamalıdır. Bu, saldırganın yeni başlıklar eklemesini veya mevcut başlıkları manipüle etmesini engeller.
    if any(c in val for c in ['\r', '\n', '\0']):
        raise ValueError("CRLF_INJECTION_DETECTED: Başlık değerinde satır sonu veya kontrol karakteri bulunamaz.")
    
    # 2. Katı karakter allowlist'i uygula (Sadece güvenli ASCII alfanümerik)
    # Başlık değerinde yalnızca belirli güvenli karakterlerin bulunmasına izin verilir. Bu, başlık değerinin beklenmeyen veya zararlı karakterler içermesini önler.
    if not re.match(r'^[a-zA-Z0-9_\-]{1,30}$', val):
        raise ValueError("INVALID_HEADER_VALUE: İzin verilmeyen karakterler.")
        
    return val

def handle_client(client_socket):
    try:
        raw_request = client_socket.recv(4096).decode('latin1')
        if not raw_request:
            client_socket.close()
            return

        first_line = raw_request.split('\r\n')[0]
        path = first_line.split(' ')[1] if len(first_line.split(' ')) > 1 else '/'
        
        lang = "en"
        if "lang=" in path:
            lang = path.split("lang=")[1].split(" ")[0]
            lang = lang.replace("%0d", "\r").replace("%0a", "\n")

        # Doğrulama: Güvenli sınır denetimi
        try:
            safe_lang = validate_header_value(lang)
        except ValueError as ve:
            response = (
                "HTTP/1.1 400 Bad Request\r\n"
                "Content-Type: text/plain\r\n"
                "Connection: close\r\n\r\n"
                f"SECURITY_REJECTION: {str(ve)}"
            )
            client_socket.sendall(response.encode('latin1'))
            client_socket.close()
            return

        response = (
            "HTTP/1.1 200 OK\r\n"
            f"Set-Cookie: user_lang={safe_lang}; Secure; HttpOnly; SameSite=Strict\r\n"
            "Content-Type: text/html\r\n"
            "Connection: close\r\n\r\n"
            "<h1>Preferences Saved Securely</h1>"
        )
        client_socket.sendall(response.encode('latin1'))
    except Exception:
        pass
    finally:
        client_socket.close()

def run_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('127.0.0.1', 5061))
    server.listen(10)
    while True:
        client, _ = server.accept()
        t = threading.Thread(target=handle_client, args=(client,))
        t.daemon = True
        t.start()

if __name__ == '__main__':
    run_server()
