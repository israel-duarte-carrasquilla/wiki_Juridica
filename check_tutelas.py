import urllib.request
import re
import json

tutela_folders = [
    ("1zOqAp-XBCrxP377BXrsuMB7mSzeNz35T", "Tutelas_2024"),
    ("1S1iRvtpsInnAUw-4mkztm5jElj0jDCoL", "Tutelas_2025"),
    ("1a2Ler8p9psJVpeUyyhSkjWJaFuw2HIHz", "Tutelas_2026"),
    ("1TQWpyynPPEqW1SdkZ6Zd_IEB9yNLsCbP", "SU_2024"),
    ("13cqMRTOh12Lyix9Hb8DD8dM0ueB6I9L9", "SU_2025"),
    ("1_2J1Ltc1TKUdSZVIPv-TWfFiwF7IZlc2", "SU_2026"),
    ("11gW-qTkCplFn8dRLZI4KyFMqxHFm95nY", "Sala_Plena_C")
]

results = {}
for fid, fname in tutela_folders:
    url = f'https://drive.google.com/drive/folders/{fid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
        print(f"[{fname}] found {len(items)} items", flush=True)
        for i_id, i_name in items[:5]:
            print(f"   -> {i_name} ({i_id})", flush=True)
        results[fname] = [{"id": i[0], "name": i[1]} for i in items]
    except Exception as e:
        print(f"[{fname}] error: {e}", flush=True)

with open('tutelas_found.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
