import urllib.request
import re
import json
import time
import os
import concurrent.futures

def scan_all_drive():
    root_id = "1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ"
    queue = [(root_id, "")]
    visited = set([root_id])
    all_files = []

    print("Iniciando escaneo completo de Google Drive...")
    while queue:
        curr_id, curr_path = queue.pop(0)
        url = f'https://drive.google.com/drive/folders/{curr_id}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
            items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
            for i_id, i_name in items:
                if "Shared folder" in i_name:
                    sub_name = i_name.replace(" Shared folder", "").strip()
                    if i_id not in visited:
                        visited.add(i_id)
                        new_path = f"{curr_path}/{sub_name}" if curr_path else sub_name
                        queue.append((i_id, new_path))
                else:
                    all_files.append({
                        "id": i_id,
                        "name": i_name,
                        "folder_path": curr_path
                    })
        except Exception as e:
            print(f"Error en {curr_path}: {e}")
        time.sleep(0.15)

    print(f"Escaneo finalizado: {len(all_files)} archivos encontrados en total.")
    return all_files

if __name__ == '__main__':
    files = scan_all_drive()
    with open('all_drive_files_updated.json', 'w', encoding='utf-8') as f:
        json.dump(files, f, indent=2, ensure_ascii=False)
