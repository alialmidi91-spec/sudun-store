#!/usr/bin/env python3
"""
ينشئ نسخاً أصغر (400/640/900px) من نفس صور المنتجات والبراند لاستخدامها في srcset،
ويكتب قائمتها في src/data/image-variants.ts. الصور الأصلية لا تُمسّ ولا تُعدَّل.

التشغيل (يحتاج Python 3 و Pillow):  pip install Pillow  ثم  python3 scripts/make-image-variants.py
الصورة التي ليست لها نسخ تعمل عادي بالموقع (تُحمَّل الأصلية فقط) — يعني تشغيل السكربت اختياري.
"""
import json, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
FOLDERS = ['images/products', 'images/brand']
WIDTHS = [400, 640, 900]
VARIANT = re.compile(r'-(\d+)\.webp$')

manifest = {}
for folder in FOLDERS:
    for f in sorted((PUBLIC / folder).glob('*')):
        if f.suffix.lower() not in ('.webp', '.jpg', '.jpeg', '.png') or VARIANT.search(f.name):
            continue
        im = Image.open(f)
        icc = im.info.get('icc_profile')
        made = []
        for w in WIDTHS:
            if w >= im.width:
                continue
            out = f.with_name(f'{f.stem}-{w}.webp')
            if not out.exists() or out.stat().st_mtime < f.stat().st_mtime:
                h = round(im.height * w / im.width)
                small = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB').resize((w, h), Image.LANCZOS)
                kw = {'quality': 88, 'method': 6}
                if icc:
                    kw['icc_profile'] = icc
                small.save(out, 'WEBP', **kw)
                print('  +', out.relative_to(ROOT))
            made.append(w)
        if made:
            manifest['/' + str(f.relative_to(PUBLIC)).replace('\\', '/')] = {'width': im.width, 'variants': made}

ts = ROOT / 'src/data/image-variants.ts'
ts.write_text(
    '// ملف مولَّد تلقائياً بواسطة scripts/make-image-variants.py — لا تعدّليه يدوياً.\n'
    '// لكل صورة أصلية: عرضها الحقيقي والعروض المتوفرة لها كنسخ أصغر (اسم-400.webp ...).\n'
    'export const imageVariants: Record<string, { width: number; variants: number[] }> = '
    + json.dumps(manifest, indent=2, ensure_ascii=False) + ';\n',
    encoding='utf-8',
)
print(f'{len(manifest)} صورة في {ts.relative_to(ROOT)}')
