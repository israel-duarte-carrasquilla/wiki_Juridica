import json
import re

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

tutela_mds = []
for it in files:
    name = re.sub(r'\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$', '', it['name'], flags=re.IGNORECASE).strip()
    if name.endswith('.md') and ('Salas_Revision_Tutelas_T' in it['folder_path'] or 'Sala_Plena_Unificacion_SU' in it['folder_path'] or 'Sala_Plena_Constitucionalidad_C' in it['folder_path'] or 'Salas_Especiales_Seguimiento_Autos_A' in it['folder_path']):
        it['clean_name'] = name
        tutela_mds.append(it)

print(f"Total Corte Constitucional MD files: {len(tutela_mds)}")
for m in tutela_mds[:5]:
    print(" ", m['clean_name'], "|", m['folder_path'])
