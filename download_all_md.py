import json
import re
import os
import concurrent.futures
import urllib.request
import time

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

md_files = []
for it in files:
    raw_name = it['name']
    cleaned_name = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', raw_name, flags=re.IGNORECASE).strip()
    if cleaned_name.endswith('.md'):
        it['clean_name'] = cleaned_name
        md_files.append(it)

print(f"Total MD targets to download: {len(md_files)}")

os.makedirs('data/md_docs', exist_ok=True)

def download_file(item):
    fid = item['id']
    fname = item['clean_name']
    dest = os.path.join('data/md_docs', fname)
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        return True, fname
    url = f"https://drive.google.com/uc?export=download&id={fid}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                content = resp.read()
            with open(dest, 'wb') as f:
                f.write(content)
            return True, fname
        except Exception:
            time.sleep(0.5)
    return False, fname

start = time.time()
success = 0
failed = 0

with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    futures = [executor.submit(download_file, item) for item in md_files]
    for fut in concurrent.futures.as_completed(futures):
        ok, fname = fut.result()
        if ok:
            success += 1
        else:
            failed += 1
        if (success + failed) % 50 == 0 or (success + failed) == len(md_files):
            print(f"Progress: {success + failed}/{len(md_files)} (Success: {success}, Failed: {failed})", flush=True)

print(f"Completed in {time.time() - start:.1f}s. Success: {success}, Failed: {failed}")
