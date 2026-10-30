import json
import os
import concurrent.futures
import urllib.request
import time

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

fichas = [x for x in files if 'Fichas_Jurisprudenciales_MD' in x['folder_path'] and x['name'].startswith('Ficha_')]
print(f"Total fichas to download: {len(fichas)}")

os.makedirs('data/fichas_md', exist_ok=True)

def download_ficha(item):
    fid = item['id']
    fname = item['name'].replace(' Markdown', '').strip()
    dest = os.path.join('data/fichas_md', fname)
    if os.path.exists(dest) and os.path.getsize(dest) > 10:
        return True, fname
    url = f"https://drive.google.com/uc?export=download&id={fid}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                content = resp.read()
            with open(dest, 'wb') as f:
                f.write(content)
            return True, fname
        except Exception:
            time.sleep(0.5)
    return False, fname

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(download_ficha, fichas))

success = sum(1 for r in results if r[0])
print(f"Downloaded {success}/{len(fichas)} fichas.")
