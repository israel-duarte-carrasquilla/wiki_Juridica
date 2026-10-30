import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

fid = '1IIIJZHoMBevMoRvBTzlKpCzRHhF9FEQN' # T-001-24.md
url = f"https://drive.google.com/uc?export=download&id={fid}"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    content = resp.read().decode('utf-8', errors='replace')

# Look for the last "RESUELVE" in uppercase
last_resuelve_idx = content.rfind("RESUELVE")
print("Last RESUELVE index:", last_resuelve_idx)
if last_resuelve_idx != -1:
    print(content[last_resuelve_idx:last_resuelve_idx+1500])
