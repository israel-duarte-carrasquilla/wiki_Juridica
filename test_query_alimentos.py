import json
import re

with open('jurisprudencia_db.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Test query: "ejemplos de fallos de tutela por fallo de Alimentos"
query = "ejemplos de fallos de tutela por fallo de Alimentos"
print(f"Testing query: '{query}'")

terms = ['alimento', 'cuota', 'familia', 'menor', 'niñ', 'tutela']
matches = []

for d in db:
    score = 0
    full = f"{d['radicado']} {d['corte']} {d['tema']} {d['resuelve']} {' '.join(d.get('descriptores', []))}".lower()
    
    if d['tipo'] == 'T' or d['radicado'].startswith('T-'):
        score += 15
    if 'alimento' in full or 'cuota' in full:
        score += 40
    if 'familia' in full:
        score += 25
    if 'menor' in full or 'niñ' in full:
        score += 20
    
    if score > 0:
        matches.append((score, d))

matches.sort(key=lambda x: x[0], reverse=True)

print(f"Total matching providencias: {len(matches)}")
for score, d in matches[:5]:
    print(f"\nScore {score}: [{d['radicado']}] - {d['corte']}")
    print(f"  Citación: {d['citacion_formal']}")
    print(f"  Tema: {d['tema'][:90]}...")
    print(f"  Resuelve: {d['resuelve'][:180]}...")
