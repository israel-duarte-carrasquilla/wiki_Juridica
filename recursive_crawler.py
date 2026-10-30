import urllib.request
import re
import json
import time

visited = set()
all_files = []
folders_to_visit = [
    ("1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ", "ROOT")
]

# We already know the 9 main folders:
main_folders = [
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

queue = list(main_folders)
visited.add("1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ")

while queue:
    fid, fpath = queue.pop(0)
    if fid in visited:
        continue
    visited.add(fid)
    url = f'https://drive.google.com/drive/folders/{fid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
        for i_id, i_name in items:
            if "Shared folder" in i_name:
                sub_name = i_name.replace(" Shared folder", "").strip()
                queue.append((i_id, f"{fpath}/{sub_name}"))
            else:
                clean_name = i_name.replace(" Markdown", "").replace(" Text", "").replace(" PDF", "").replace(" Word", "").strip()
                all_files.append({
                    "id": i_id,
                    "name": clean_name,
                    "raw_tooltip": i_name,
                    "folder": fpath
                })
        print(f"[{fpath}] queued subfolders, total files so far: {len(all_files)}")
    except Exception as e:
        print(f"[{fpath}] Error: {e}")
    time.sleep(0.5)

print(f"\nFINISH! Total files collected: {len(all_files)}")
with open('all_scanned_files.json', 'w', encoding='utf-8') as f:
    json.dump(all_files, f, indent=2, ensure_ascii=False)
