import os
import json
from collections import Counter

json_dir = 'data/json_docs'
all_docs = []

for fn in os.listdir(json_dir):
    if fn.endswith('.json'):
        fp = os.path.join(json_dir, fn)
        try:
            with open(fp, 'r', encoding='utf-8') as f:
                d = json.load(f)
                d['_filename'] = fn
                all_docs.append(d)
        except Exception as e:
            # try with latin1
            try:
                with open(fp, 'r', encoding='latin1') as f:
                    d = json.load(f)
                    d['_filename'] = fn
                    all_docs.append(d)
            except Exception as e2:
                print(f"Error reading {fn}: {e2}")

print(f"Successfully loaded {len(all_docs)} JSON docs")

# Check distribution of cortes, tipos, años
cortes = Counter(d.get('corte', 'Desconocido') for d in all_docs)
tipos = Counter(d.get('tipo', 'Desconocido') for d in all_docs)
anos = Counter(d.get('ano', 'Desconocido') for d in all_docs)

print("\nCortes:")
for c, cnt in cortes.most_common():
    print(f"  {c}: {cnt}")

print("\nTipos de providencia:")
for t, cnt in tipos.most_common():
    print(f"  {t}: {cnt}")

print("\nAños:")
for a, cnt in sorted(anos.items(), key=lambda x: str(x[0])):
    print(f"  {a}: {cnt}")

# Check sample keywords like alimentos, cuota, menor, nna, salud, laboral, etc.
keywords = ['alimento', 'cuota', 'menor', 'familia', 'niño', 'salud', 'pension', 'debido proceso', 'tutela']
print("\nKeyword frequency across documents:")
for kw in keywords:
    matches = [d for d in all_docs if kw in (d.get('tema') or '').lower() or kw in (d.get('resuelve') or '').lower() or kw in (d.get('radicado') or '').lower()]
    print(f"  '{kw}': {len(matches)} matches")
    if matches and kw == 'alimento':
        for m in matches[:3]:
            print(f"    - {m.get('radicado')} ({m.get('corte')}): Tema: {str(m.get('tema'))[:100]}...")
