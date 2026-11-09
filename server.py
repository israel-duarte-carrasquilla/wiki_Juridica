#!/usr/bin/env python3
"""
JurisWiki Colombia - Servidor Local de Desarrollo
Puerto por defecto: 8880
Sincronización Automática con Google Drive cada 30 minutos
Proxy Multimodelo de Inteligencia Artificial (Gemini, OpenAI, Claude, DeepSeek)
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
import urllib.request
import urllib.error

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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

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

    def do_POST(self):
        # AI Proxy endpoint (Gemini, OpenAI, Claude, DeepSeek)
        if self.path in ['/api/ask', '/api/ask-ai', '/api.php?action=ask', '/api.php?action=ask_ai']:
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}

            provider = data.get('provider', 'gemini').lower()
            model = data.get('model', '')
            api_key = data.get('apiKey', '')
            query = data.get('query', '')
            system_prompt = data.get('systemPrompt', '')
            context = data.get('context', '')

            full_prompt = query
            if context:
                full_prompt = f"CONTEXTO DE JURISPRUDENCIA:\n{context}\n\nCONSULTA:\n{query}"

            if not api_key:
                env_key = os.environ.get(f"{provider.upper()}_API_KEY") or os.environ.get("GEMINI_API_KEY", "")
                api_key = env_key

            if not api_key and provider != 'local':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'local_rag',
                    'message': f'Sin API Key configurada para {provider}.'
                }, ensure_ascii=False).encode('utf-8'))
                return

            try:
                answer_text = ""
                # 1. Gemini
                if provider == 'gemini':
                    use_model = model or 'gemini-2.5-flash'
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{use_model}:generateContent?key={api_key}"
                    payload = {
                        "contents": [{
                            "parts": [{"text": (system_prompt + "\n\n" if system_prompt else "") + full_prompt}]
                        }],
                        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1500}
                    }
                    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        answer_text = res_json['candidates'][0]['content']['parts'][0]['text']

                # 2. OpenAI (ChatGPT)
                elif provider == 'openai':
                    use_model = model or 'gpt-4o-mini'
                    url = "https://api.openai.com/v1/chat/completions"
                    messages = []
                    if system_prompt:
                        messages.append({"role": "system", "content": system_prompt})
                    messages.append({"role": "user", "content": full_prompt})
                    payload = {"model": use_model, "messages": messages, "temperature": 0.2, "max_tokens": 1500}
                    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {api_key}'
                    })
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        answer_text = res_json['choices'][0]['message']['content']

                # 3. Anthropic (Claude)
                elif provider == 'claude':
                    use_model = model or 'claude-3-5-haiku-20241022'
                    url = "https://api.anthropic.com/v1/messages"
                    payload = {
                        "model": use_model,
                        "max_tokens": 1500,
                        "temperature": 0.2,
                        "messages": [{"role": "user", "content": full_prompt}]
                    }
                    if system_prompt:
                        payload["system"] = system_prompt
                    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
                        'Content-Type': 'application/json',
                        'x-api-key': api_key,
                        'anthropic-version': '2023-06-01'
                    })
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        answer_text = res_json['content'][0]['text']

                # 4. DeepSeek
                elif provider in ['deepseek', 'openrouter']:
                    url = "https://api.deepseek.com/chat/completions" if provider == 'deepseek' else "https://openrouter.ai/api/v1/chat/completions"
                    use_model = model or ('deepseek-chat' if provider == 'deepseek' else 'deepseek/deepseek-chat')
                    messages = []
                    if system_prompt:
                        messages.append({"role": "system", "content": system_prompt})
                    messages.append({"role": "user", "content": full_prompt})
                    payload = {"model": use_model, "messages": messages, "temperature": 0.2, "max_tokens": 1500}
                    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {api_key}'
                    })
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        answer_text = res_json['choices'][0]['message']['content']

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'provider': provider,
                    'model': model or 'default',
                    'text': answer_text
                }, ensure_ascii=False).encode('utf-8'))
                return

            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8', errors='replace')
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': f'Error al contactar con {provider} ({e.code})',
                    'details': err_body
                }, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': f'Error interno en llamada a {provider}: {str(e)}'
                }, ensure_ascii=False).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

def run():
    global PORT, SYNC_INTERVAL
    parser = argparse.ArgumentParser(description="Servidor local JurisWiki Colombia")
    parser.add_argument('--port', type=int, default=8880, help="Puerto del servidor (default: 8880)")
    parser.add_argument('--sync-interval', type=int, default=1800, help="Intervalo de revisión de Google Drive en segundos (default: 1800 = 30 min)")
    args = parser.parse_args()

    PORT = args.port
    SYNC_INTERVAL = args.sync_interval
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    sync_thread = threading.Thread(target=background_sync_worker, args=(SYNC_INTERVAL,), daemon=True)
    sync_thread.start()

    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), JurisprudenciaHandler) as httpd:
        print("===========================================================")
        print("  [+] JurisWiki Colombia - Servidor Local Activo")
        print(f"  [+] URL Local: http://localhost:{PORT}")
        print(f"  [+] Proxy Multimodelo IA: Google Gemini, OpenAI, Claude, DeepSeek")
        print(f"  [+] Sincronización automática de Drive: Cada {SYNC_INTERVAL // 60} minutos")
        print("===========================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor...")
            httpd.server_close()
            sys.exit(0)

if __name__ == '__main__':
    run()
