import os
import re
import json

md_dir = 'data/md_docs'
results = {}

for fn in os.listdir(md_dir):
    if not fn.endswith('.md'):
        continue
    base = os.path.splitext(fn)[0]
    fp = os.path.join(md_dir, fn)
    with open(fp, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # 1. Extract Temas-Subtemas
    temas_subtemas = ""
    ts_m = re.search(r'\*\*TEMAS-SUBTEMAS\*\*\s*(.*?)(?:\n---|\n#|\n\*\*[A-Z\s]{4,}\*\*-\w|\Z)', content, re.DOTALL)
    if not ts_m:
        ts_m = re.search(r'###\s*⚖️\s*Síntesis del Asunto[^\n]*\n>\s*(.*?)(?:\n\n|\n###|\Z)', content, re.DOTALL)
    
    # Also find all bold capitalized descriptors like **DERECHO A LA SALUD**
    descriptors = re.findall(r'\*\*([A-ZÁÉÍÓÚÑ\s]{4,}(?:-[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)?)\*\*', content[:15000])
    clean_desc = [d.strip() for d in descriptors if len(d.strip()) > 5 and not d.startswith('REPÚBLICA') and not d.startswith('CORTE') and not d.startswith('SALA') and not d.startswith('SENTENCIA') and not d.startswith('FICHA')]

    # 2. Extract operative RESUELVE
    resuelve_text = ""
    # Look for last RESUELVE
    r_idx = content.rfind("RESUELVE")
    if r_idx != -1:
        tail = content[r_idx:]
        # Get from RESUELVE up to Comuníquese, publíquese, cúmplase or end of text
        end_m = re.search(r'(?:Notifíquese|Comuníquese|Cúmplase|Publíquese|Magistrad[ao]|Salvamento de voto)', tail, re.IGNORECASE)
        if end_m and end_m.start() > 100:
            resuelve_text = tail[:end_m.start()].strip()
        else:
            resuelve_text = tail[:3000].strip()
        # Clean markdown hashes/stars
        resuelve_text = re.sub(r'^[#\*\s]*RESUELVE[#\*\s:]*', '', resuelve_text, flags=re.IGNORECASE).strip()
    
    # 3. Extract Magistrado Ponente if truncated
    ponente = ""
    p_m = re.search(r'\*\*Magistrado\(a\) Ponente:\*\*\s*([^\n\r\|]+)', content)
    if not p_m:
        p_m = re.search(r'Magistrad[ao] Ponente:\s*([^\n\r]+)', content, re.IGNORECASE)
    if p_m:
        ponente = p_m.group(1).replace('`', '').strip()

    # 4. Extract Expediente
    expediente = ""
    e_m = re.search(r'\*\*Número de Expediente:\*\*\s*([^\n\r\|]+)', content)
    if not e_m:
        e_m = re.search(r'Expediente\s*[:\s]*([T0-9\.\-\s]+)', content, re.IGNORECASE)
    if e_m:
        expediente = e_m.group(1).replace('`', '').strip()

    # 5. Extract Fecha
    fecha = ""
    f_m = re.search(r'\*\*Fecha de Providencia:\*\*\s*([^\n\r\|]+)', content)
    if f_m:
        fecha = f_m.group(1).replace('`', '').strip()

    results[base] = {
        "descriptors": clean_desc[:8],
        "resuelve": resuelve_text[:3500] if resuelve_text else "",
        "ponente": ponente,
        "expediente": expediente,
        "fecha": fecha
    }

print(f"Parsed {len(results)} markdown files successfully!")
sample = list(results.items())[0]
print("Sample:", sample[0])
print(" Descriptors:", sample[1]["descriptors"][:3])
print(" Resuelve preview:", sample[1]["resuelve"][:200])
