#!/usr/bin/env python3
"""
JurisWiki Colombia - Servidor Local de Desarrollo
Puerto por defecto: 8880
Sincronización Automática con Google Drive cada 30 minutos
Uso: python server.py [--port 8880] [--sync-interval 1800]
"""

import http.server
import socketserver
import os
import sys
import argparse
import json
import threading
import time

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8880
SYNC_INTERVAL = 1800 # 30 minutos en segundos
last_sync_time = "Iniciando..."
is_syncing = False

def background_sync_worker(interval):
    global last_sync_time, is_syncing
    # Esperar 10 segundos al iniciar
    time.sleep(10)
    while True:
        try:
            print("\n[⏰ Cron Interno] Verificando actualizaciones en Google Drive...")
            is_syncing = True
            from sync_drive import run_sync
            res = run_sync()
            last_sync_time = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"[✅ Cron Interno] Sincronización exitosa: {res['total_providencias']} providencias disponibles.")
        except Exception as e:
            print(f"[❌ Cron Interno] Error en sincronización: {e}")
        finally:
            is_syncing = False
        time.sleep(interval)

class JurisprudenciaHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        global last_sync_time, is_syncing

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
                "ultima_sincronizacion": last_sync_time,
                "sincronizando": is_syncing,
                "intervalo_minutos": SYNC_INTERVAL // 60,
                "app": "JurisWiki Colombia"
            }
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
            return

        # Trigger sync endpoint
        if self.path == '/api/sync':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            try:
                from sync_drive import run_sync
                res = run_sync()
                last_sync_time = time.strftime("%Y-%m-%d %H:%M:%S")
                self.wfile.write(json.dumps({"success": True, "resultado": res}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return

        if self.path == '/' or self.path == '':
            self.path = '/index.html'

        return super().do_GET()

def run():
    global PORT, SYNC_INTERVAL
    parser = argparse.ArgumentParser(description="Servidor local JurisWiki Colombia")
    parser.add_argument('--port', type=int, default=8880, help="Puerto del servidor (default: 8880)")
    parser.add_argument('--sync-interval', type=int, default=1800, help="Intervalo de revisión de Google Drive en segundos (default: 1800 = 30 min)")
    args = parser.parse_args()

    PORT = args.port
    SYNC_INTERVAL = args.sync_interval
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # Iniciar hilo de sincronización periódica en segundo plano
    sync_thread = threading.Thread(target=background_sync_worker, args=(SYNC_INTERVAL,), daemon=True)
    sync_thread.start()

    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), JurisprudenciaHandler) as httpd:
        print("===========================================================")
        print("  [+] JurisWiki Colombia - Servidor Local Activo")
        print(f"  [+] URL Local: http://localhost:{PORT}")
        print(f"  [+] Red Local: http://127.0.0.1:{PORT}")
        print(f"  [+] Sincronización automática de Drive: Cada {SYNC_INTERVAL // 60} minutos")
        print(f"  [+] Endpoint manual de sincronización: http://localhost:{PORT}/api/sync")
        print(f"  [+] Puerto: {PORT}")
        print("===========================================================")
        print("  Servidor en ejecución. Presiona Ctrl+C para detener.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor...")
            httpd.server_close()
            sys.exit(0)

if __name__ == '__main__':
    run()
