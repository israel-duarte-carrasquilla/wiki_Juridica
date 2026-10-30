#!/usr/bin/env python3
"""
JurisWiki Colombia - Servidor Local de Desarrollo
Puerto por defecto: 8880
Uso: python server.py [--port 8880]
"""

import http.server
import socketserver
import os
import sys
import argparse
import json

# Forzar utf-8 en stdout si es soportado
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8880

class JurisprudenciaHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        # Health check endpoint
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            db_size = 0
            if os.path.exists('jurisprudencia_db.json'):
                try:
                    with open('jurisprudencia_db.json', 'r', encoding='utf-8') as f:
                        db = json.load(f)
                        db_size = len(db)
                except Exception:
                    pass
            resp = {
                "status": "online",
                "port": PORT,
                "providencias_indexadas": db_size,
                "app": "JurisWiki Colombia"
            }
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
            return
        
        # Default fallback to index.html for root
        if self.path == '/' or self.path == '':
            self.path = '/index.html'

        return super().do_GET()

def run():
    global PORT
    parser = argparse.ArgumentParser(description="Servidor local JurisWiki Colombia")
    parser.add_argument('--port', type=int, default=8880, help="Puerto del servidor (default: 8880)")
    args = parser.parse_args()

    PORT = args.port
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), JurisprudenciaHandler) as httpd:
        print("===========================================================")
        print("  [+] JurisWiki Colombia - Servidor Local Activo")
        print(f"  [+] URL Local: http://localhost:{PORT}")
        print(f"  [+] Red Local: http://127.0.0.1:{PORT}")
        print(f"  [+] Directorio: {os.getcwd()}")
        print(f"  [+] Puerto: {PORT}")
        print("===========================================================")
        print("  Servidor en ejecucion. Presiona Ctrl+C para detener.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor...")
            httpd.server_close()
            sys.exit(0)

if __name__ == '__main__':
    run()
