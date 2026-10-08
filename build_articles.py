#!/usr/bin/env python3
"""Génère le catalogue public des articles Decap à partir des fichiers JSON."""
from pathlib import Path
import json,re,sys
from datetime import date
root=Path(__file__).resolve().parent
entries=[]
for path in sorted((root/'contenu/articles').glob('*.json')):
    obj=json.loads(path.read_text(encoding='utf-8'))
    if obj.get('published') is not True: continue
    slug=path.stem
    if not re.fullmatch(r'[a-zA-Z0-9_-]+',slug): raise ValueError(f'Slug invalide: {slug}')
    date.fromisoformat(obj['date'])
    for key in ('title','date','author','category','image','summary','body'):
        if not isinstance(obj.get(key),str): raise ValueError(f'{path}: champ {key} manquant ou invalide')
    entries.append({'slug':slug,**obj})
entries.sort(key=lambda item:(item['date'],item['slug']),reverse=True)
out=root/'data/articles.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(entries)} articles publiés -> {out.relative_to(root)}')
