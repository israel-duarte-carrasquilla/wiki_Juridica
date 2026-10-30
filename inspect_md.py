import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's find T-001-24.md in all_drive_files.json
with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

t001_md = [x for x in files if 'T-001-24' in x['name'] and 'md' in x['name'].lower()]
print("Found T-001-24 md:", t001_md)

if t001_md:
    fid = t001_md[0]['id']
    url = f"https://drive.google.com/uc?export=download&id={fid}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8', errors='replace')
    print("Length of T-001-24.md:", len(content))
    print("Preview:\n", content[:1500])
    # check if "RESUELVE" is in content
    idx = content.upper().find("RESUELVE")
    if idx != -1:
        print("\n--- RESUELVE SECTION ---")
        print(content[idx:idx+1000])
