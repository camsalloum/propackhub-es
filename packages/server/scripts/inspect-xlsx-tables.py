import re
import zipfile
from pathlib import Path

path = Path(r"d:\ProPackHub\apps\estimation-studio\Master Data.xlsx")
with zipfile.ZipFile(path) as z:
    rels = z.read("xl/_rels/workbook.xml.rels").decode()
    print("=== workbook rels (tables) ===")
    for m in re.finditer(r'Target="([^"]*tables[^"]*)"', rels):
        print(m.group(1))

    wb = z.read("xl/workbook.xml").decode()
    print("\n=== workbook table refs ===")
    print(re.findall(r"<table[^>]+>", wb))

    for i in range(1, 8):
        p = f"xl/worksheets/sheet{i}.xml"
        if p not in z.namelist():
            continue
        content = z.read(p).decode()
        m = re.search(r"<tableParts>.*?</tableParts>", content, re.DOTALL)
        print(f"\n=== sheet{i} tableParts ===")
        print(m.group(0) if m else "(none)")

    print("\n=== defined names vs table names ===")
    names = re.findall(r'name="([^"]+)"', z.read("xl/workbook.xml").decode())
    tbl_names = re.findall(r'name="([^"]+)"', b"".join(z.read(p) for p in z.namelist() if p.startswith("xl/tables/")))
    for n in names:
        if n in tbl_names:
            print(f"  COLLISION: defined name '{n}' == table name")
