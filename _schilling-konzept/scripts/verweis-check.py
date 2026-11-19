#!/usr/bin/env python3
"""Schlussprüfung Schilling-Konzept: alle Verweise mechanisch prüfen.

Prüft in SKILL.md, references/*.md und _arbeit/karte-*.md:
- Kapitel-Verweise "01a §3", "04 §8", "07a §1–9, 07b §11, §13", "Kapitel 06, Abschnitt 4"
  (Datei vorhanden, Überschrift "## N." bzw. "### N.M" vorhanden, a/b-Teil stimmt)
- E-Nummern (Entscheidungsregister SKILL.md), K-Nummern (10a §2), Kernregel N, M0–M7, Gruppe N, Anhang X
- Dateinamen ("07b-conversion-….md", "07b-…md", "09-04"), alte Namen ohne a/b
- Zwischenstufen der Belegstufen
- Dateigrößen (45.000 Bytes, 11a 60.000)

Aufruf: python3 -I _arbeit/verweis-check.py [Ordner]
"""
import re, sys, os, glob

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "references")

files = [os.path.join(ROOT, "SKILL.md")] + sorted(glob.glob(os.path.join(REF, "*.md"))) \
        + sorted(glob.glob(os.path.join(ROOT, "_arbeit", "karte-*.md")))

def rel(p): return os.path.relpath(p, ROOT)

# ---------- Index der Kapitel ----------
ref_files = {os.path.basename(p): p for p in glob.glob(os.path.join(REF, "*.md"))}
part_of = {}      # "01a" -> Pfad, "09-04" -> Pfad, "06" -> Pfad
group = {}        # "01" -> ["01a","01b"], "09" -> ["09-00",...]
for name, p in ref_files.items():
    m = re.match(r"^(\d{2})([ab]?)-(\d{2})?", name)
    if not m: continue
    num, ab = m.group(1), m.group(2)
    if num == "09":
        sub = re.match(r"^09-(\d{2})-", name)
        if sub:
            key = "09-" + sub.group(1)
        else:
            continue  # 09-branchen-playbooks.md = Wegweiser
    else:
        key = num + ab
    part_of[key] = p
    group.setdefault(num, []).append(key)

def headings(path):
    secs, anh, fence = {}, set(), False
    for i, line in enumerate(open(path, encoding="utf-8"), 1):
        if line.lstrip().startswith("```"):
            fence = not fence; continue
        if fence: continue
        m = re.match(r"^##\s+(\d+)\.\s", line) or re.match(r"^##\s+Gruppe\s+(\d+)\b", line)
        if m: secs[m.group(1)] = i
        m = re.match(r"^###\s+(\d+\.\d+)\b", line)
        if m: secs[m.group(1)] = i
        m = re.match(r"^##\s+Anhang\s+([A-Z])\b", line)
        if m: anh.add(m.group(1))
    return secs, anh

SECS = {k: headings(p)[0] for k, p in part_of.items()}
ANH = {k: headings(p)[1] for k, p in part_of.items()}

skill = open(files[0], encoding="utf-8").read()
E_DEF = set(re.findall(r"^- \*\*E(\d+) ", skill, re.M))
kr = skill.split("## Kernregeln", 1)[1].split("\n## ", 1)[0]
KERN = set(re.findall(r"^(\d+)\. ", kr, re.M))
K_DEF = set(re.findall(r"^\| K(\d+) \|", open(part_of["10a"], encoding="utf-8").read(), re.M))
M_DEF = set(re.findall(r"^### M(\d+):", open(part_of["02a"], encoding="utf-8").read(), re.M))
GRUPPEN = set(SECS.get("12a", {}).keys()) | set(SECS.get("12b", {}).keys())

def find_sec(sec):
    """Alle Teile, in denen der Abschnitt steht."""
    return [k for k, s in SECS.items() if sec in s]

def where_in_group(num, sec):
    return [k for k in group.get(num, []) if sec in SECS[k]]

findings = []
def add(path, ln, ref, problem, fix, sev="mittel"):
    findings.append((sev, rel(path), ln, ref, problem, fix))

def own_chapter(path):
    b = os.path.basename(path)
    m = re.match(r"^karte-(\d{2})\.md$", b)
    if m: return ("group", m.group(1))
    m = re.match(r"^09-(\d{2})-", b)
    if m: return ("part", "09-" + m.group(1))
    m = re.match(r"^(\d{2})([ab]?)-", b)
    if m: return ("part", m.group(1) + m.group(2)) if m.group(2) or m.group(1) == "06" else ("group", m.group(1))
    return None

def sec_list(spec):
    """'5–7' -> ['5','7'], '3.2–3.3' -> ['3.2','3.3'], '8' -> ['8']"""
    parts = re.split(r"[–-]", spec)
    out = [parts[0]]
    if len(parts) > 1 and parts[1]:
        a = parts[1]
        if "." in parts[0] and "." not in a:  # '3.2–3' selten
            a = parts[0].split(".")[0] + "." + a
        out.append(a)
    return out

LAW = r"(BGB|UWG|GewO|PAngV|HWG|DDG|TDDDG|TMG|WoVermittG|KUG|UrhG|DSGVO|BO|MBO|ZHG|GOZ|BDSG|EGBGB|BFSG|StGB|HGB|AO|UStG|MStV|Abs\.)"
CH = r"(?<![\w./-])(09-\d{2}|\d{2}[ab]?)"
tok = re.compile(CH + r" §(\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?)|(?<![\w§])§(\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?)(?![\d\w])|"
                 r"Kapitel (\d{2}[ab]?)(?:, Abschnitt (\d+(?:\.\d+)?))?|(?<!Kapitel \d\d, )(?<!Kapitel \d\d[ab], )\bAbschnitt (\d+(?:\.\d+)?)\b")

def check_ref(path, ln, txt, key, sec, explicit_key):
    """key: '01a' / '01' / '09-04'; sec: '3' oder '3.1'"""
    if key in part_of:
        if sec in SECS[key]: return
        # in der Gruppe woanders?
        num = key[:2]
        alt = where_in_group(num, sec) if not key.startswith("09-") else []
        if alt:
            add(path, ln, txt, f"§{sec} steht nicht in {key}, sondern in {alt[0]}", f"„{key} §{sec}“ → „{alt[0]} §{sec}“", "mittel")
        else:
            near = [s for s in SECS[key] if s.split(".")[0] == sec.split(".")[0]]
            add(path, ln, txt, f"Abschnitt §{sec} gibt es in {key} nicht" + (f" (vorhanden: {', '.join(sorted(near))})" if near else ""),
                "Abschnitt richtig benennen oder Verweis streichen", "hoch")
    elif key in group:
        if not where_in_group(key, sec):
            add(path, ln, txt, f"Abschnitt §{sec} gibt es in Kapitel {key} ({'/'.join(group[key])}) nicht", "Abschnitt richtig benennen", "hoch")
    else:
        add(path, ln, txt, f"Kapitel/Datei {key} gibt es nicht", "richtige Datei nennen", "hoch")

for path in files:
    lines = open(path, encoding="utf-8").read().split("\n")
    own = own_chapter(path)
    for ln, line in enumerate(lines, 1):
        last = None  # letzter Kapitel-Präfix in dieser Zeile
        for m in tok.finditer(line):
            txt = m.group(0)
            if m.group(1):  # "01a §3"
                key = m.group(1); last = key
                # Ziffer davor? (z. B. "Rn. 01")
                for s in sec_list(m.group(2)):
                    check_ref(path, ln, txt, key, s, True)
            elif m.group(3):  # bare "§3"
                after = line[m.end():m.end() + 14]
                before = line[max(0, m.start() - 16):m.start()]
                if re.match(r"\s*" + LAW, after) or int(m.group(3).split(".")[0].split("–")[0]) > 25:
                    continue
                if re.search(r"Master-Prompt\s*$", before): continue
                if re.search(r"Playbook\s*$", before):
                    for s in sec_list(m.group(3)):
                        miss = [k for k in group["09"] if k != "09-00" and s not in SECS[k]]
                        if miss: add(path, ln, txt, f"„Playbook §{s}“ fehlt in {', '.join(miss)}", "Abschnittsnummer prüfen", "niedrig")
                    continue
                own_key = own[1] if own else None
                fn = [x for x in re.finditer(r"(?<![\w\d-])(\d{2}[ab]?)-[\w-]+\.md", line[:m.start()])]
                if fn:
                    k_fn = fn[-1].group(1)
                    if not last or fn[-1].start() > line.rfind(last + " §", 0, m.start()):
                        last = k_fn if k_fn in part_of or k_fn in group else last
                key = last or own_key
                if key is None:
                    add(path, ln, txt, "§-Verweis ohne Kapitel, nicht auflösbar", "Kapitel davorschreiben", "niedrig"); continue
                def found(k, s):
                    if k is None: return False
                    if k in SECS and s in SECS[k]: return True
                    return bool(where_in_group(k[:2], s)) if not k.startswith("09-") else False
                # direkt in einer Aufzählung hinter fremdem Präfix? ("05a §4, §11")
                prev = line[:m.start()]
                in_list = bool(last) and re.search(CH + r" §[\d.–-]+(?:, §[\d.–-]+)*(?:,| und| bzw\.) $", prev)
                for s in sec_list(m.group(3)):
                    if last and found(last, s):
                        continue
                    if found(own_key, s):
                        if in_list and own_key and last and last[:2] != own_key[:2]:
                            add(path, ln, txt, f"§{s} steht in einer Aufzählung hinter „{last}“, gemeint ist aber die eigene Datei ({[k for k in group.get(own_key[:2],[own_key]) if k in SECS and s in SECS[k]][0]})",
                                f"„§{s}“ → „{[k for k in group.get(own_key[:2],[own_key]) if k in SECS and s in SECS[k]][0]} §{s}“", "niedrig")
                        continue
                    if own_key == "09-00" or os.path.basename(path) == "09-branchen-playbooks.md":
                        continue  # beschreibt die Abschnittsfolge der Marken-Dateien
                    add(path, ln, txt, f"§{s} weder in {last or '-'} noch in der eigenen Datei gefunden", "Verweis prüfen und korrigieren", "hoch")
            elif m.group(4):  # "Kapitel 06[, Abschnitt 4]"
                key = m.group(4); last = key
                if key not in part_of and key not in group:
                    add(path, ln, txt, f"Kapitel {key} gibt es nicht", "richtiges Kapitel nennen", "hoch"); continue
                if m.group(5):
                    if key == "09":
                        add(path, ln, txt, "alter Verweis „Kapitel 09, Abschnitt N“ (09 ist in Marken-Dateien geteilt)", f"durch „09-{int(m.group(5).split('.')[0]):02d}“ bzw. Marken-Datei mit Abschnitt ersetzen", "niedrig")
                    else:
                        check_ref(path, ln, txt, key, m.group(5), True)
            elif m.group(6):  # "Abschnitt 4" ohne Kapitel
                pass  # meist Fließtext ("Abschnitt 4 des Blatts"), unten gesondert gelistet

        for m in re.finditer(r"09-xx §(\d+)", line):
            miss = [k for k in group["09"] if k != "09-00" and m.group(1) not in SECS[k]]
            if miss: add(path, ln, m.group(0), f"§{m.group(1)} fehlt in {', '.join(miss)}", "Nummer prüfen", "mittel")
        # Anti-Muster-Nummern ohne §: "(6.7)" in 12a/12b, "12a 1.2" überall
        if os.path.basename(path).startswith("12"):
            for m in re.finditer(r"\((?:siehe |vgl\. )?([1-8]\.\d{1,2})\)", line):
                if not find_sec(m.group(1)) or not set(find_sec(m.group(1))) & {"12a", "12b"}:
                    add(path, ln, m.group(0), f"Anti-Muster {m.group(1)} gibt es nicht", "Nummer prüfen", "hoch")
        for m in re.finditer(r"(?<![\w./-])(12[ab]?) (\d\.\d{1,2})(?![\d])", line):
            k, sec = m.group(1), m.group(2)
            where = [x for x in ("12a", "12b") if sec in SECS[x]]
            if not where:
                add(path, ln, m.group(0), f"Anti-Muster {sec} gibt es nicht", "Nummer prüfen", "hoch")
            elif k != "12" and k not in where:
                add(path, ln, m.group(0), f"{sec} steht in {where[0]}", f"„{m.group(0)}“ → „{where[0]} §{sec}“", "mittel")
            else:
                add(path, ln, m.group(0), "Verweis ohne §-Zeichen (Schreibweise weicht ab)", f"„{m.group(0)}“ → „{k} §{sec}“; Inhalt prüfen", "niedrig")
        # E-, K-, Kernregel-, M-, Gruppe-, Anhang-Verweise
        for m in re.finditer(r"(?<![\w-])E(\d+)(?![\w])", line):
            if m.group(1) not in E_DEF:
                add(path, ln, m.group(0), f"E{m.group(1)} gibt es im Entscheidungsregister nicht (E1–E{max(map(int,E_DEF))})", "richtige E-Nummer setzen", "hoch")
        for m in re.finditer(r"(?<![\w-])K(\d+)(?![\w])", line):
            if m.group(1) not in K_DEF:
                add(path, ln, m.group(0), f"K{m.group(1)} gibt es in 10a §2 nicht (K1–K{max(map(int,K_DEF))})", "richtige K-Nummer setzen", "hoch")
        for m in re.finditer(r"Kernregel(?:n)? (\d+)", line):
            if m.group(1) not in KERN:
                add(path, ln, m.group(0), f"Kernregel {m.group(1)} gibt es nicht (1–{max(map(int,KERN))})", "richtige Nummer", "hoch")
        for m in re.finditer(r"(?<![\w-])M(\d+)(?![\w])", line):
            if m.group(1) not in M_DEF:
                add(path, ln, m.group(0), f"Schritt M{m.group(1)} gibt es in 02a nicht", "richtige M-Nummer", "hoch")
        for m in re.finditer(r"Gruppe[n]? (\d+)", line):
            if "12" in line or os.path.basename(path).startswith("12"):
                if m.group(1) not in GRUPPEN:
                    add(path, ln, m.group(0), f"Gruppe {m.group(1)} gibt es in 12a/12b nicht", "richtige Gruppe", "mittel")
        for m in re.finditer(r"(04b?)\s+Anhang\s+([A-Z])\b", line):
            k = "04b"
            if m.group(2) not in ANH[k]:
                add(path, ln, m.group(0), f"Anhang {m.group(2)} fehlt in 04b", "richtigen Anhang", "hoch")

        # Kurz-Dateinamen mit Auslassung: "07b-…md", "09-0…md"
        for m in re.finditer(r"(?<![\w/\d-])(\d{2}[a-z]?(?:-\d{2})?)-?…\.?md", line):
            pre = m.group(1)
            if not any(n.startswith(pre + "-") for n in ref_files):
                add(path, ln, m.group(0), f"Kurzname {m.group(0)}: keine Datei {pre}-… in references/", "richtigen Teil (a/b) nennen", "hoch")
            elif pre[:2] in group and len(group[pre[:2]]) > 1 and not re.match(r"\d{2}[ab]$|09-\d{2}$", pre):
                add(path, ln, m.group(0), f"Kurzname {m.group(0)} ohne a/b", "a oder b ergänzen", "mittel")
        # Dateinamen
        for m in re.finditer(r"(?<![\w/\d-])((\d{2})([a-z]?)(?:-(\d{2}))?-[\wäöüß-]+\.md)", line):
            name, num, ab, sub = m.group(1), m.group(2), m.group(3), m.group(4)
            if name in ref_files: continue
            if name.startswith("00-baukarten"):
                add(path, ln, name, "references/00-baukarten.md existiert (noch) nicht; die Karten liegen nur in _arbeit/karte-*.md", "Karten zu references/00-baukarten.md zusammenführen, bevor das Konzept abgegeben wird", "hoch")
                continue
            if num in group and not ab and num not in ("06", "09"):
                add(path, ln, name, f"alter Dateiname ohne a/b ({name})", f"durch {' bzw. '.join(os.path.basename(part_of[k]) for k in group[num])} ersetzen", "mittel")
            else:
                add(path, ln, name, f"Datei {name} gibt es in references/ nicht", "richtigen Dateinamen setzen", "hoch")

# ---------- Kapiteltabelle SKILL.md: Bereiche gegen echte Überschriften ----------
for ln, line in enumerate(skill.split("\n"), 1):
    m = re.match(r"^\| `(\d{2}[ab]?)-[\w-]+\.md` \| §(\d+)–(\d+)", line)
    if not m: continue
    k, a, b = m.group(1), m.group(2), m.group(3)
    top = sorted(int(x) for x in SECS[k] if "." not in x)
    if not top or top[0] != int(a) or top[-1] != int(b):
        add(files[0], ln, f"{k} §{a}–{b}", f"Kapiteltabelle nennt §{a}–{b}, Datei hat §{top[0]}–{top[-1]}", f"auf §{top[0]}–{top[-1]} setzen", "mittel")

# ---------- Zwischenstufen ----------
zw = re.compile(r"belegt(,| als\b| im Kern| aber| \(| bis | / |/plausibel)|(schwach|teilweise|gut|eher|halb|weitgehend|nur teilweise) belegt|plausibel bis|plausibel/|\[belegt\]|\[plausibel,|\[Hypothese,|\[belegt;")
for path in files:
    fence = False
    for ln, line in enumerate(open(path, encoding="utf-8"), 1):
        if line.lstrip().startswith("```"): fence = not fence; continue
        if fence: continue
        for m in zw.finditer(line):
            ctx = line[max(0, m.start() - 50): m.end() + 50].strip()
            findings.append(("ZW", rel(path), ln, m.group(0), ctx, ""))

# ---------- Größen ----------
for name, p in ref_files.items():
    size = os.path.getsize(p)
    lim = 60000 if name.startswith("11a") else 45000
    if size > lim:
        findings.append(("hoch", rel(p), 0, "Größe", f"{size} Bytes > {lim}", "kürzen"))

order = {"hoch": 0, "mittel": 1, "niedrig": 2, "ZW": 3}
for f in sorted(findings, key=lambda x: (order[x[0]], x[1], x[2])):
    print(" | ".join(str(x) for x in f))
print(f"\n{len([f for f in findings if f[0]!='ZW'])} Verweis-Befunde, {len([f for f in findings if f[0]=='ZW'])} Zwischenstufen-Treffer")
print("E:", sorted(map(int, E_DEF))[-1], "K:", sorted(map(int, K_DEF))[-1], "Kern:", sorted(map(int, KERN))[-1], "M:", sorted(M_DEF))
