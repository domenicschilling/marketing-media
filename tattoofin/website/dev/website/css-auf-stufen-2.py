#!/usr/bin/env python3
"""Zweiter Durchgang (18.11.2026): restliche feste Werte der Startseiten-CSS auf Stufen. Zeilennummer + alter Text werden geprüft."""
from pathlib import Path
P = Path(__file__).resolve().parents[2] / "public/assets/start/style.css"
L = P.read_text(encoding="utf-8").split("\n")
E = {
 86: [("font-size:17px", "font-size:var(--f-ui)")],
 95: [("font-size:15px", "font-size:var(--f-ui)")],
 96: [("font-size:13px", "font-size:var(--f-fn)"), ("border-radius:9px 4px 4px 9px", "border-radius:var(--r-karte) var(--r-klein) var(--r-klein) var(--r-karte)")],
 106: [("font-size:13px", "font-size:var(--f-fn)")],
 107: [("font-size:13px", "font-size:var(--f-fn)")],
 150: [("font-size:22px", "font-size:var(--f-lead)")],
 151: [("font-size:21px", "font-size:var(--f-lead)")],
 154: [("font-size:17px", "font-size:var(--f-text)")],
 155: [("font-size:13px", "font-size:var(--f-klein)")],
 159: [("font-size:15px", "font-size:var(--f-ui)")],
 223: [("font-size:24px", "font-size:var(--f-lead)")],
 224: [("font-size:23px", "font-size:var(--f-lead)")],
 260: [("font-size:clamp(20px,5.4vw,25px)", "font-size:var(--f-lead)")],
 263: [("font-size:15px", "font-size:var(--f-ui)")],
 266: [("font-size:13.5px", "font-size:var(--f-klein)")],
 297: [("font-size:15px", "font-size:var(--f-ui)")],
 325: [("font-size:15px", "font-size:var(--f-ui)")],
 326: [("font-size:clamp(21px,5.8vw,25px)", "font-size:var(--f-lead)")],
 330: [("font-size:13px", "font-size:var(--f-klein)")],
 333: [("border-radius:8px", "border-radius:var(--r-klein)"), ("font-size:15px", "font-size:var(--f-ui)")],
 346: [("font-size:clamp(54px,5.6vw,86px)", "font-size:clamp(54px,5.6vw,80px)")],
 347: [("font-size:clamp(17px,1.6vw,23px)", "font-size:clamp(16px,1.6vw,22px)")],
 348: [("font-size:17px", "font-size:var(--f-text)")],
 382: [("font-size:17px", "font-size:var(--f-ui)")],
 386: [("border-radius:18px", "border-radius:var(--r-karte)")],
 394: [("font-size:15px", "font-size:var(--f-ui)")],
 397: [("border-radius:4px", "border-radius:var(--r-klein)")],
 400: [("border-radius:12px", "border-radius:var(--r-karte)"), ("font-size:15px", "font-size:var(--f-ui)")],
 409: [("font-size:26px", "font-size:var(--f-h3)")],
 415: [("font-size:15px", "font-size:var(--f-ui)")],
 466: [("font-size:15px", "font-size:var(--f-ui)")],
 476: [("font-size:clamp(19px,5vw,23px)", "font-size:var(--f-lead)")],
 479: [("font-size:17px", "font-size:var(--f-ui)")],
 480: [("font-size:19px", "font-size:var(--f-text)")],
 532: [("font-size:clamp(20px,1.9vw,25px)", "font-size:clamp(20px,1.9vw,22px)")],
 537: [("font-size:clamp(38px,4.05vw,58px)", "font-size:clamp(38px,4.05vw,56px)")],
 545: [("font-size:clamp(19px,5.1vw,22px)", "font-size:var(--f-lead)")],
 546: [("font-size:15px", "font-size:var(--f-ui)")],
 559: [("font-size:clamp(21px,1.75vw,25px)", "font-size:var(--f-lead)")],
 566: [("font-size:clamp(16px,4.3vw,20px)", "font-size:clamp(16px,4.3vw,18px)")],
 570: [("font-size:clamp(19px,5vw,23px)", "font-size:var(--f-lead)")],
 572: [("font-size:15px", "font-size:var(--f-ui)")],
 573: [("font-size:15px", "font-size:var(--f-ui)")],
 584: [("font-size:clamp(28px,7.6vw,40px)", "font-size:var(--f-h2)")],
 598: [("border-radius:4px", "border-radius:var(--r-klein)"), ("font:600 11px/1", "font:600 var(--f-fn)/1")],
 607: [("font-size:clamp(20px,5.3vw,24px)", "font-size:var(--f-lead)")],
 623: [("font-size:15px", "font-size:var(--f-ui)")],
 632: [("font-size:34px", "font-size:28px")],
}
for nr, ers in E.items():
    for alt, neu in ers:
        if L[nr - 1].count(alt) != 1:
            raise SystemExit(f"Zeile {nr}: {alt} nicht eindeutig: {L[nr-1][:120]}")
        L[nr - 1] = L[nr - 1].replace(alt, neu)
s = "\n".join(L)
# € in Zahlen: feste Stufe je Ort statt .72em (sonst entstehen Zwischengrößen)
s = s.replace(".eur{font-family:var(--text);font-weight:800;font-size:.72em;", ".eur{font-family:var(--text);font-weight:800;font-size:var(--f-ui);", 1)
s += ("\n/* Designsystem 18.11.2026: € in großen Zahlen auf feste Stufen */\n"
      ".betrag .eur{font-size:var(--f-h3)}.fall-text h3 .eur{font-size:var(--f-h3)}.beleg caption .eur{font-size:var(--f-ui)}\n")
P.write_text(s, encoding="utf-8")
print("Schritt 2 ok")
