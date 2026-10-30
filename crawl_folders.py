import urllib.request
import re
import json
import time

folders = [
    ("1gfP5UTkoe4uYolV9hDr8Lvb1Yax63azT", "01_Corte_Constitucional"),
    ("1Vf-N2vHsmrKZ4zSKR6iTHwAg7YWW7p0c", "02_Corte_Suprema_de_Justicia"),
    ("15bjBH8Qw4x069GxLsxEKquldpyIzH8I1", "03_Consejo_de_Estado"),
    ("1s8V6g6nnikRewMTr9Ea2kY2ZHQmnzAXG", "04_Tribunales_Superiores_Distrito_Judicial"),
    ("1vNvA-yn6ZTCV5zm4aHt4U12hQxOmutJ6", "05_Juzgados_Especializados"),
    ("1rHYqRcXDUGZT92eMjBc3FWsRInWkLPmy", "06_Indices_Fichas_y_Metadatos_IA"),
    ("1mCFTdpjsy9aNC21eMXAxuZRTk2anyB6v", "07_Secretaria_del_Senado_Normativa_y_Leyes"),
    ("1ux-tEf8wtkb0IRl6vPlxMXTyb6Gx8dgx", "08_Superintendencias_Funciones_Jurisdiccionales"),
    ("1e_lxX4A4vLBIKB2Hpt8Elbr214xdVlN_", "09_Tribunales_de_Arbitramento_y_Laudos")
]

results = {}

for fid, fname in folders:
    url = f'https://drive.google.com/drive/folders/{fid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        # Find files or subfolders with data-tooltip or data-id
        items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
        # Also clean up
        clean_items = []
        for i_id, i_name in items:
            clean_items.append({"id": i_id, "name": i_name})
            
        print(f"[{fname}] found {len(clean_items)} items")
        for it in clean_items[:5]:
            print(f"   -> {it['name']} ({it['id']})")
        results[fname] = clean_items
    except Exception as e:
        print(f"[{fname}] Error: {e}")
    time.sleep(1)

with open('all_folder_items.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print("Saved all_folder_items.json")
