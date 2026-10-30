import json
import re
import os
import concurrent.futures
import urllib.request
import time

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

# Extract real filename and clean up
cleaned_files = []
for it in files:
    raw_name = it['name']
    # remove trailing file type keywords
    cleaned_name = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', raw_name, flags=re.IGNORECASE).strip()
    it['clean_name'] = cleaned_name
    cleaned_files.append(it)

json_targets = [x for x in cleaned_files if x['clean_name'].endswith('.json')]
print(f"Total JSON targets to download: {len(json_targets)}")

os.makedirs('data/json_docs', exist_ok=True)

def download_file(item):
    fid = item['id']
    fname = item['clean_name']
    dest = os.path.join('data/json_docs', fname)
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
        except Exception as e:
            time.sleep(0.5)
    return False, fname

start = time.time()
success = 0
failed = 0

with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
    futures = [executor.submit(download_file, item) for item in json_targets]
    for fut in concurrent.futures.as_completed(futures):
        ok, fname = fut.result()
        if ok:
            success += 1
        else:
            failed += 1
        if (success + failed) % 50 == 0 or (success + failed) == len(json_targets):
            print(f"Progress: {success + failed}/{len(json_targets)} (Success: {success}, Failed: {failed})", flush=True)

print(f"Completed in {time.time() - start:.1f}s. Success: {success}, Failed: {failed}")
