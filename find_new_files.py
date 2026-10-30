import json
import re

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    old_files = json.load(f)

with open('all_drive_files_updated.json', 'r', encoding='utf-8') as f:
    new_files = json.load(f)

old_ids = set(x['id'] for x in old_files)
added_files = [x for x in new_files if x['id'] not in old_ids]

print(f"Total old files: {len(old_files)}")
print(f"Total new files: {len(new_files)}")
print(f"Newly added files: {len(added_files)}")

# Group by folder
folders = {}
for a in added_files:
    fld = a.get('folder_path', 'ROOT')
    folders[fld] = folders.get(fld, 0) + 1

print("\nNew files by folder:")
for fld, cnt in sorted(folders.items(), key=lambda x: x[1], reverse=True):
    print(f"  [{fld}]: {cnt} new files")

print("\nSample new files:")
for a in added_files[:15]:
    print("  -", a['name'], "|", a['folder_path'])
