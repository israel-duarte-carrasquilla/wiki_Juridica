import os
import json
import re

all_records = []
seen_radicados = set()

# Load JSON docs
json_dir = 'data/json_docs'
for fn in os.listdir(json_dir):
    if fn.endswith('.json'):
        fp = os.path.join(json_dir, fn)
        try:
            with open(fp, 'r', encoding='utf-8') as f:
                d = json.load(f)
        except Exception:
            try:
                with open(fp, 'r', encoding='latin1') as f:
                    d = json.load(f)
            except Exception:
                continue
        
        radicado = d.get('radicado') or os.path.splitext(fn)[0]
        corte = d.get('corte') or 'Corte Constitucional'
        ano = d.get('ano') or ''
        tipo = d.get('tipo') or ''
        magistrado = d.get('magistrado_ponente') or ''
        fecha = d.get('fecha_providencia') or ''
        expediente = d.get('expediente') or ''
        tema = d.get('tema') or ''
        resuelve = d.get('resuelve') or ''
        sala = d.get('sala_especializada') or ''
        url_origen = d.get('url_origen') or ''
        
        # Clean text
        def clean_val(v):
            if isinstance(v, str):
                return re.sub(r'\s+', ' ', v).strip()
            return str(v) if v is not None else ''

        record = {
            "id": radicado,
            "radicado": clean_val(radicado),
            "corte": clean_val(corte),
            "ano": clean_val(ano),
            "tipo": clean_val(tipo),
            "magistrado_ponente": clean_val(magistrado),
            "fecha_providencia": clean_val(fecha),
            "expediente": clean_val(expediente),
            "sala_especializada": clean_val(sala),
            "tema": clean_val(tema),
            "resuelve": clean_val(resuelve),
            "url_origen": clean_val(url_origen),
            "fuente": "Providencia Judicial"
        }
        all_records.append(record)
        seen_radicados.add(radicado)

# Also load fichas_md
fichas_dir = 'data/fichas_md'
if os.path.exists(fichas_dir):
    for fn in os.listdir(fichas_dir):
        if fn.endswith('.md'):
            fp = os.path.join(fichas_dir, fn)
            try:
                with open(fp, 'r', encoding='utf-8') as f:
                    txt = f.read()
            except Exception:
                with open(fp, 'r', encoding='latin1') as f:
                    txt = f.read()

            radicado = fn.replace('Ficha_', '').replace('.md', '').strip()
            if radicado in seen_radicados:
                continue

            corp_m = re.search(r'-\s*\*\*Corporaci[oó]n:\*\*\s*(.*)', txt)
            sala_m = re.search(r'-\s*\*\*Sala Especializada:\*\*\s*(.*)', txt)
            ponente_m = re.search(r'-\s*\*\*Magistrado Ponente:\*\*\s*(.*)', txt)
            fecha_m = re.search(r'-\s*\*\*Fecha:\*\*\s*(.*)', txt)
            tema_m = re.search(r'-\s*\*\*Tema\s*/\s*Asunto:\*\*\s*(.*)', txt)
            
            sintesis = ""
            sint_m = re.search(r'##\s*S[ií]ntesis y Contenido de la Decisi[oó]n\s*(.*)', txt, re.DOTALL)
            if sint_m:
                sintesis = sint_m.group(1).strip()
            
            # Find year
            year = "2026"
            y_m = re.search(r'\b(201\d|202\d)\b', txt)
            if y_m:
                year = y_m.group(1)

            resuelve_txt = sintesis[:1500] if sintesis else "Fallo judicial registrado en ficha de relatoría institucional."

            record = {
                "id": radicado,
                "radicado": radicado,
                "corte": corp_m.group(1).strip() if corp_m else "Tribunales Departamentales",
                "ano": year,
                "tipo": "Ficha",
                "magistrado_ponente": ponente_m.group(1).strip() if ponente_m else "",
                "fecha_providencia": fecha_m.group(1).strip() if fecha_m else "",
                "expediente": radicado,
                "sala_especializada": sala_m.group(1).strip() if sala_m else "",
                "tema": tema_m.group(1).strip() if tema_m else "Fallo jurisprudencial",
                "resuelve": resuelve_txt,
                "url_origen": f"https://drive.google.com/drive/folders/1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ",
                "fuente": "Ficha de Relatoría"
            }
            all_records.append(record)
            seen_radicados.add(radicado)

print(f"Total compiled records: {len(all_records)}")
with open('jurisprudencia_db.json', 'w', encoding='utf-8') as f:
    json.dump(all_records, f, indent=2, ensure_ascii=False)
print("Saved to jurisprudencia_db.json")
