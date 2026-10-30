import json
import re

with open('jurisprudencia_db.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

terms = ['alimento', 'cuota', 'menor', 'familia', 'niñ', 'sustento', 'hijo', 'patern', 'matern']
found = []

for d in db:
    full_text = f"{d.get('radicado','')} {d.get('tema','')} {d.get('resuelve','')} {d.get('magistrado_ponente','')} {d.get('sala_especializada','')}".lower()
    matches = [t for t in terms if t in full_text]
    if matches:
        found.append((d['radicado'], d['corte'], matches, d['tema'][:120], d['resuelve'][:150]))

print(f"Total matching docs: {len(found)}")
for r, c, m, t, res in found[:10]:
    print(f"[{r}] ({c}) Matches: {m}")
    print(f"  Tema: {t}")
    print(f"  Resuelve: {res}\n")
