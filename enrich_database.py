import os
import json
import re

# Load MD enrichment
from parse_md_enrich import results as md_enriched

# Google Drive folder links map
drive_folder_url = "https://drive.google.com/drive/folders/1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ"

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    drive_files = json.load(f)

# Map cleaned filename base to drive file id
drive_map = {}
for it in drive_files:
    raw_name = it['name']
    cleaned_name = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', raw_name, flags=re.IGNORECASE).strip()
    base = os.path.splitext(cleaned_name)[0]
    if base not in drive_map:
        drive_map[base] = []
    drive_map[base].append({
        "id": it['id'],
        "name": cleaned_name,
        "folder": it.get('folder_path', '')
    })

json_dir = 'data/json_docs'
final_records = []
seen_ids = set()

def clean_str(s):
    if not s:
        return ""
    # fix windows-1252 / smart quotes artifacts
    s = s.replace('\x93', '"').replace('\x94', '"').replace('\x91', "'").replace('\x92', "'")
    s = s.replace('\x96', '-').replace('\x97', '-').replace('\xa0', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

for fn in sorted(os.listdir(json_dir)):
    if not fn.endswith('.json'):
        continue
    base = os.path.splitext(fn)[0]
    fp = os.path.join(json_dir, fn)
    try:
        with open(fp, 'r', encoding='utf-8') as f:
            d = json.load(f)
    except Exception:
        with open(fp, 'r', encoding='latin1') as f:
            d = json.load(f)

    radicado = clean_str(d.get('radicado') or base)
    corte = clean_str(d.get('corte') or 'Corte Constitucional')
    ano = d.get('ano') or ''
    tipo = clean_str(d.get('tipo') or '')
    magistrado = clean_str(d.get('magistrado_ponente') or '')
    magistrado = re.sub(r'^[\*\s\-]+|[\*\s\-]+$', '', magistrado).strip()
    fecha = clean_str(d.get('fecha_providencia') or '')
    expediente = clean_str(d.get('expediente') or '')
    tema = clean_str(d.get('tema') or '')
    resuelve = clean_str(d.get('resuelve') or '')
    sala = clean_str(d.get('sala_especializada') or '')
    url_origen = clean_str(d.get('url_origen') or '')

    # Check if we have MD enrichment for this document
    descriptors = []
    if base in md_enriched:
        enrich = md_enriched[base]
        if enrich.get('resuelve') and len(enrich['resuelve']) > len(resuelve):
            resuelve = clean_str(enrich['resuelve'])
        if enrich.get('ponente') and len(enrich['ponente']) > len(magistrado):
            magistrado = clean_str(enrich['ponente'])
        if enrich.get('expediente') and len(enrich['expediente']) > len(expediente):
            expediente = clean_str(enrich['expediente'])
        if enrich.get('descriptors'):
            descriptors = [clean_str(x) for x in enrich['descriptors']]

    # Get drive items
    items_in_drive = drive_map.get(base, [])
    # Find PDF or MD id if available
    pdf_id = next((x['id'] for x in items_in_drive if x['name'].endswith('.pdf')), None)
    md_id = next((x['id'] for x in items_in_drive if x['name'].endswith('.md')), None)
    drive_view_url = f"https://drive.google.com/file/d/{pdf_id}/view" if pdf_id else (f"https://drive.google.com/file/d/{md_id}/view" if md_id else drive_folder_url)

    # Formal Citation string
    # Colombian citation standard: Corte Constitucional, Sentencia T-001/24 (M.P. Cristina Pardo Schlesinger)
    citacion = f"{corte}, Providencia {radicado}"
    if magistrado:
        citacion += f" (M.P. {magistrado})"
    if fecha:
        citacion += f", {fecha}"

    record = {
        "id": base,
        "radicado": radicado,
        "corte": corte,
        "ano": str(ano),
        "tipo": tipo,
        "magistrado_ponente": magistrado,
        "fecha_providencia": fecha,
        "expediente": expediente,
        "sala_especializada": sala,
        "tema": tema,
        "descriptores": descriptors,
        "resuelve": resuelve,
        "url_origen": url_origen,
        "drive_url": drive_view_url,
        "citacion_formal": citacion
    }

    final_records.append(record)
    seen_ids.add(base)

print(f"Total processed: {len(final_records)} records")

with open('jurisprudencia_db.json', 'w', encoding='utf-8') as f:
    json.dump(final_records, f, indent=2, ensure_ascii=False)

print("Saved enriched database to jurisprudencia_db.json")
