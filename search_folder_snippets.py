import json
import re

with open('drive_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search for folder IDs and what follows them
ids = [
    '1gfP5UTkoe4uYolV9hDr8Lvb1Yax63azT',
    '1Vf-N2vHsmrKZ4zSKR6iTHwAg7YWW7p0c',
    '15bjBH8Qw4x069GxLsxEKquldpyIzH8I1',
    '1s8V6g6nnikRewMTr9Ea2kY2ZHQmnzAXG',
    '1vNvA-yn6ZTCV5zm4aHt4U12hQxOmutJ6',
    '1rHYqRcXDUGZT92eMjBc3FWsRInWkLPmy',
    '1mCFTdpjsy9aNC21eMXAxuZRTk2anyB6v',
    '1ux-tEf8wtkb0IRl6vPlxMXTyb6Gx8dgx',
    '1e_lxX4A4vLBIKB2Hpt8Elbr214xdVlN_'
]

for fid in ids:
    pos = 0
    print(f"=== ID: {fid} ===")
    while True:
        idx = html.find(fid, pos)
        if idx == -1:
            break
        snippet = html[max(0, idx-40):min(len(html), idx+150)].replace('\n', ' ')
        print("  Snippet:", snippet)
        pos = idx + len(fid)
