import json
import os
import re

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

json_bases = set()
for f in os.listdir('data/json_docs'):
    if f.endswith('.json'):
        json_bases.add(os.path.splitext(f)[0])

print(f"Downloaded JSON docs: {len(json_bases)}")

# Check markdown files in files list
md_files = []
for it in files:
    raw = it['name']
    cleaned = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', raw, flags=re.IGNORECASE).strip()
    if cleaned.endswith('.md'):
        base = os.path.splitext(cleaned)[0]
        it['clean_name'] = cleaned
        it['base'] = base
        md_files.append(it)

print(f"Total Markdown files in drive: {len(md_files)}")
md_without_json = [x for x in md_files if x['base'] not in json_bases]
print(f"Markdown files WITHOUT JSON: {len(md_without_json)}")

for m in md_without_json[:10]:
    print(" -", m['clean_name'], "in folder:", m['folder_path'])
