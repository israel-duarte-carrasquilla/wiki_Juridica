import urllib.request
import re
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

# We'll do a breadth-first search of all folders in drive
root_id = "1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ"

queue = [(root_id, "")]
visited_folders = set([root_id])
all_found_items = []

while queue:
    curr_id, curr_path = queue.pop(0)
    url = f'https://drive.google.com/drive/folders/{curr_id}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
        for i_id, i_name in items:
            if "Shared folder" in i_name:
                sub_folder_name = i_name.replace(" Shared folder", "").strip()
                if i_id not in visited_folders:
                    visited_folders.add(i_id)
                    new_path = f"{curr_path}/{sub_folder_name}" if curr_path else sub_folder_name
                    queue.append((i_id, new_path))
            else:
                all_found_items.append({
                    "id": i_id,
                    "name": i_name,
                    "folder_path": curr_path
                })
        print(f"[{curr_path or 'ROOT'}] found {len(items)} items | Queue: {len(queue)} | Total files: {len(all_found_items)}", flush=True)
    except Exception as e:
        print(f"[{curr_path}] Error: {e}", flush=True)
    time.sleep(0.3)

print(f"\nScan complete! Total files found: {len(all_found_items)}")
with open('all_drive_files.json', 'w', encoding='utf-8') as f:
    json.dump(all_found_items, f, indent=2, ensure_ascii=False)
