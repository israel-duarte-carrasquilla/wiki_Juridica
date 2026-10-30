import json
from parse_md_enrich import results

tuts = {k: v for k, v in results.items() if k.startswith('T-')}
for k, v in sorted(tuts.items()):
    descs = ", ".join(v['descriptors'][:4])
    print(f"[{k}] {v['ponente']} | {descs}")
