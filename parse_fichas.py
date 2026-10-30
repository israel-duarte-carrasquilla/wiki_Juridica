import os
import re
import json

fichas_dir = 'data/fichas_md'
fichas_parsed = []

for fn in os.listdir(fichas_dir):
    if fn.endswith('.md'):
        fp = os.path.join(fichas_dir, fn)
        with open(fp, 'r', encoding='utf-8', errors='replace') as f:
            txt = f.read()
        
        # Parse fields
        corp = re.search(r'-\s*\*\*Corporaci[oó]n:\*\*\s*(.*)', txt)
        sala = re.search(r'-\s*\*\*Sala Especializada:\*\*\s*(.*)', txt)
        ponente = re.search(r'-\s*\*\*Magistrado Ponente:\*\*\s*(.*)', txt)
        fecha = re.search(r'-\s*\*\*Fecha:\*\*\s*(.*)', txt)
        tema = re.search(r'-\s*\*\*Tema\s*/\s*Asunto:\*\*\s*(.*)', txt)
        
        # Sintesis y decision
        sintesis = ""
        sint_m = re.search(r'##\s*S[ií]ntesis y Contenido de la Decisi[oó]n\s*(.*)', txt, re.DOTALL)
        if sint_m:
            sintesis = sint_m.group(1).strip()
            
        fichas_parsed.append({
            "radicado": fn.replace('Ficha_', '').replace('.md', ''),
            "corporacion": corp.group(1).strip() if corp else "",
            "sala_especializada": sala.group(1).strip() if sala else "",
            "magistrado_ponente": ponente.group(1).strip() if ponente else "",
            "fecha": fecha.group(1).strip() if fecha else "",
            "tema": tema.group(1).strip() if tema else "",
            "sintesis": sintesis[:500]
        })

print(f"Parsed {len(fichas_parsed)} fichas")
for f in fichas_parsed[:5]:
    print(f["radicado"], "|", f["corporacion"], "|", f["tema"][:80])
