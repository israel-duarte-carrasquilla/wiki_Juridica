import re

with open('drive_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

callbacks = re.findall(r'AF_initDataCallback\((.*?)\);', html, re.DOTALL)
for i, cb in enumerate(callbacks):
    key_m = re.search(r"key:\s*'([^']+)'", cb)
    key = key_m.group(1) if key_m else f"cb_{i}"
    print(f"Callback {i}: key={key}, length={len(cb)}")
    # Print sample text if contains words in Spanish like tutela, alimentos, fallo, sentencia, docx, pdf
    for kw in ['tutela', 'alimento', 'fallo', 'sentencia', 'jurisprudencia', 'corte', 'auto']:
        matches = [m.start() for m in re.finditer(kw, cb, re.IGNORECASE)]
        if matches:
            print(f"  Keyword '{kw}' found {len(matches)} times in {key}")
            for m in matches[:3]:
                snippet = cb[max(0, m-50):min(len(cb), m+100)].replace('\n', ' ')
                print(f"    Snippet: {snippet}")
