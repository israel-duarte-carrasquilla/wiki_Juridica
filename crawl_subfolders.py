import urllib.request
import re
import json

targets = [
    ("13j_UHcZ2E0-gjGsE7evB1Yk1W52ecNAM", "Fichas_Jurisprudenciales_MD"),
    ("1n_lBtkOOpqkCSQJYYNXsJQWnc0Eou97o", "Indices_Estructurados_JSON"),
    ("1-FqBr5sLcsuISR5FCxiXMALX1w7gn9op", "Resumenes_Doctrina_IA"),
    ("1XMFcJRuyVIat3iRO0HfkKpyguPIHJJKt", "Salas_Revision_Tutelas_T"),
    ("16cJik0VG7LHjBPnG73c95pOkbHHthGvQ", "Sala_Plena_Unificacion_SU"),
    ("1HwmonohRzqt-au61pXhPPBxxpOlA86bw", "Juzgados_de_Familia"),
    ("1EZwYiiNCQ0T3jhb4L50PEXTDyDyaDqLg", "Sala_Familia_Superior")
]

results = {}

for fid, fname in targets:
    url = f'https://drive.google.com/drive/folders/{fid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
        clean_items = []
        for i_id, i_name in items:
            clean_items.append({"id": i_id, "name": i_name})
            
        print(f"[{fname}] found {len(clean_items)} items")
        for it in clean_items[:10]:
            print(f"   -> {it['name']} ({it['id']})")
        results[fname] = clean_items
    except Exception as e:
        print(f"[{fname}] Error: {e}")

with open('subfolder_items.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
