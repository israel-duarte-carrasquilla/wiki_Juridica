import json
from collections import Counter

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

print(f"Total files: {len(files)}")
exts = Counter()
for item in files:
    name = item['name']
    if '.' in name:
        ext = name.split('.')[-1].lower()
    else:
        ext = 'no_ext'
    exts[ext] += 1

print("\nExtensions breakdown:")
for ext, count in exts.most_common():
    print(f"  .{ext}: {count}")

json_files = [x for x in files if x['name'].endswith('.json')]
md_files = [x for x in files if x['name'].endswith('.md')]
txt_files = [x for x in files if x['name'].endswith('.txt')]

print(f"\nJSON files count: {len(json_files)}")
print(f"Markdown files count: {len(md_files)}")
print(f"Text files count: {len(txt_files)}")

print("\nSample JSON files:")
for j in json_files[:5]:
    print(" ", j)
