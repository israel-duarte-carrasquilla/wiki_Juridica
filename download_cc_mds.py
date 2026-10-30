import json
import re
import os
import urllib.request
import concurrent.futures
import time

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

targets = []
for it in files:
    name = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', it['name'], flags=re.IGNORECASE).strip()
    if name.endswith('.md') and ('Salas_Revision_Tutelas_T' in it['folder_path'] or 'Sala_Plena_Unificacion_SU' in it['folder_path'] or 'Sala_Plena_Constitucionalidad_C' in it['folder_path'] or 'Salas_Especiales_Seguimiento_Autos_A' in it['folder_path']):
        it['clean_name'] = name
        targets.append(it)

print(f"Downloading {len(targets)} MD files...")
os.makedirs('data/md_docs', exist_ok=True)

def fetch_file(it):
    dest = os.path.join('data/md_docs', it['clean_name'])
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        return True
    url = f"https://drive.google.com/uc?export=download&id={it['id']}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            with open(dest, 'wb') as f:
                f.write(data)
            return True
        except Exception:
            time.sleep(0.3)
    return False

start = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
    res = list(ex.map(fetch_file, targets))

success = sum(1 for r in res if r)
print(f"Downloaded {success}/{len(targets)} in {time.time()-start:.1f}s")
