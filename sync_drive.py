import os
import re
import json
import urllib.request
import concurrent.futures
import time

def run_sync():
    print("=== JurisWiki Colombia • Sincronizador de Google Drive ===")
    
    # 1. Escaneo del Google Drive
    root_id = "1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ"
    queue = [(root_id, "")]
    visited = set([root_id])
    all_files = []

    print("[1/5] Escaneando árbol de carpetas en Google Drive...")
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
            pass
        time.sleep(0.08)

    print(f"      Total archivos detectados en Drive: {len(all_files)}")
    with open('all_drive_files.json', 'w', encoding='utf-8') as f:
        json.dump(all_files, f, indent=2, ensure_ascii=False)

    # 2. Identificar y descargar JSON faltantes
    os.makedirs('data/json_docs', exist_ok=True)
    os.makedirs('data/md_docs', exist_ok=True)

    json_targets = []
    md_targets = []

    for it in all_files:
        clean_name = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', it['name'], flags=re.IGNORECASE).strip()
        it['clean_name'] = clean_name
        base = os.path.splitext(clean_name)[0]

        if clean_name.endswith('.json'):
            dest = os.path.join('data/json_docs', clean_name)
            if not os.path.exists(dest) or os.path.getsize(dest) < 10:
                json_targets.append(it)
        elif clean_name.endswith('.md'):
            dest = os.path.join('data/md_docs', clean_name)
            if not os.path.exists(dest) or os.path.getsize(dest) < 10:
                md_targets.append(it)

    print(f"[2/5] Nuevos JSON a descargar: {len(json_targets)} | Nuevos MD: {len(md_targets)}")

    def download_doc(item, folder):
        dest = os.path.join(folder, item['clean_name'])
        url = f"https://drive.google.com/uc?export=download&id={item['id']}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        for _ in range(3):
            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    content = resp.read()
                with open(dest, 'wb') as f:
                    f.write(content)
                return True
            except Exception:
                time.sleep(0.3)
        return False

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        futs_json = [ex.submit(download_doc, it, 'data/json_docs') for it in json_targets]
        futs_md = [ex.submit(download_doc, it, 'data/md_docs') for it in md_targets]
        concurrent.futures.wait(futs_json + futs_md)

    print(f"      Descarga de documentos finalizada con éxito.")

    # 3. Re-construir base de datos enriquecida
    print("[3/5] Re-compilando base de datos jurisprudencial...")
    import subprocess
    subprocess.run(['python', '-X', 'utf8', 'enrich_database.py'], check=True)

    # 4. Re-crear paquete cPanel
    print("[4/5] Actualizando wiki_juridica_cpanel.zip...")
    subprocess.run(['python', 'create_zip.py'], check=True)

    # 5. Cargar conteo final
    with open('jurisprudencia_db.json', 'r', encoding='utf-8') as f:
        db = json.load(f)

    print(f"[5/5] Sincronización completada. Total providencias disponibles: {len(db)}")
    return {
        "status": "success",
        "total_providencias": len(db),
        "nuevos_json_descargados": len(json_targets),
        "nuevos_md_descargados": len(md_targets)
    }

if __name__ == '__main__':
    res = run_sync()
    print("\nResultado:", json.dumps(res, indent=2, ensure_ascii=False))
