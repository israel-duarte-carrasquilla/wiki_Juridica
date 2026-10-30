import re
import json

with open('drive_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for patterns in Google Drive initial state / JS variables (e.g. _DRIVE_ivd or DS: or AF_initDataCallback)
print("Searching for JS data blobs...")
matches = re.findall(r'AF_initDataCallback\((.*?)\);', html, re.DOTALL)
print(f"Found {len(matches)} AF_initDataCallback calls")

for idx, m in enumerate(matches):
    print(f"--- Callback {idx} ---")
    if 'key:' in m:
        key_m = re.search(r"key:\s*'([^']+)'", m)
        if key_m:
            print("Key:", key_m.group(1))
    # Check if there are filenames like .pdf, .docx, .doc, Sentencia, etc.
    filenames = re.findall(r'[\w\s\.-]+\.(?:pdf|docx|doc|txt|rtf)', m, re.IGNORECASE)
    if filenames:
        print("Filenames found:", filenames[:10])

# Also search for filenames anywhere in the html
all_files = set(re.findall(r'[\w\s\.-]+\.(?:pdf|docx|doc|txt|rtf)', html, re.IGNORECASE))
print("\nAll doc filenames in html:", len(all_files))
for fn in sorted(all_files):
    print(" -", fn)
