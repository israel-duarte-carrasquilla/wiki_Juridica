import json

with open('jurisprudencia_db.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

print(f"Total documents: {len(db)}")
sample = db[0]
print("Sample record keys:", list(sample.keys()))
for k, v in sample.items():
    print(f"  {k}: {str(v)[:120]}")

# Let's check some Tutelas
tutelas = [d for d in db if d.get('tipo') == 'T' or d.get('radicado', '').startswith('T-')]
print(f"\nTotal tutelas (T): {len(tutelas)}")
for t in tutelas[:5]:
    print(f"  {t['radicado']} | Ponente: {t['magistrado_ponente']} | Fecha: {t['fecha_providencia']} | Tema: {t['tema'][:70]}... | Resuelve: {t['resuelve'][:80]}...")
