#!/usr/bin/env python3
"""Einmal-Umbau 18.11.2026 (Schilling Websitekonzept, Schritt 6): public/assets/start/style.css auf das Designsystem.
Schrift 8 Stufen, Radius 3 Stufen (+ Pille/Kreis), Schatten 2 Stufen, Bewegung 2 Dauern. Werte: dev/website/designsystem.md.
Ausnahme: Passung des ersten Bildschirms auf kleinen/flachen Geräten (max-height-Regeln) bleibt unverändert, weil gemessen."""
from pathlib import Path
P = Path(__file__).resolve().parents[2] / "public/assets/start/style.css"
s = P.read_text(encoding="utf-8")
if "--f-h1" in s:
    raise SystemExit("schon umgebaut")
R = [
 # Werte (Designsystem)
 ("  --h1:clamp(42px,11.6vw,88px);\n  --h2:clamp(31px,8.2vw,56px);\n}",
  "  /* Designsystem (dev/website/designsystem.md): 8 Schriftstufen, 3 Radien, 2 Schatten, 2 Dauern */\n"
  "  --f-fn:12px; --f-klein:14px; --f-ui:16px; --f-text:var(--t); --f-lead:clamp(19px,5vw,22px);\n"
  "  --f-h3:clamp(21px,5.6vw,28px); --f-h2:clamp(31px,8.2vw,56px); --f-h1:clamp(42px,11.6vw,80px);\n"
  "  --h1:var(--f-h1); --h2:var(--f-h2);\n"
  "  --r-klein:6px; --r-karte:14px; --r-gross:26px; --r-pille:999px;\n"
  "  --sch-hart:4px 5px 0 var(--blau); --sch-klein:3px 3px 0 var(--blau);\n"
  "  --schnell:150ms; --ruhig:300ms;\n}"),
 (":focus-visible{outline:3px solid var(--blau);outline-offset:3px;border-radius:4px}", ":focus-visible{outline:3px solid var(--blau);outline-offset:3px;border-radius:var(--r-klein)}"),
 ("padding:10px 16px;border-radius:8px}", "padding:10px 16px;border-radius:var(--r-klein)}"),
 ("h3{font-size:clamp(21px,5.6vw,26px);", "h3{font-size:var(--f-h3);"),
 (".klein{font-size:14px;", ".klein{font-size:var(--f-klein);"),
 (".raten-fn{font-size:12px;", ".raten-fn{font-size:var(--f-fn);"),
 ("font-size:clamp(22px,6vw,28px);line-height:1;text-decoration:none;box-shadow:4px 5px 0 var(--blau);transition:transform .12s,box-shadow .12s;",
  "font-size:var(--f-h3);line-height:1;text-decoration:none;box-shadow:var(--sch-hart);transition:transform var(--schnell),box-shadow var(--schnell);"),
 (".nr{position:absolute;display:grid;place-items:center;width:30px;height:30px;padding-top:.18em;border-radius:50%;background:var(--blau);color:var(--gelb);font-size:18px;",
  ".nr{position:absolute;display:grid;place-items:center;width:30px;height:30px;padding-top:.18em;border-radius:50%;background:var(--blau);color:var(--gelb);font-size:var(--f-text);"),
 ("border-radius:15px 5px 5px 15px;padding:2px 10px 2px 21px;font:700 14px/1.3 var(--text)", "border-radius:var(--r-karte) var(--r-klein) var(--r-klein) var(--r-karte);padding:2px 10px 2px 21px;font:700 var(--f-klein)/1.3 var(--text)"),
 ("transition:transform .16s}", "transition:transform var(--schnell)}"),
 ("border-radius:20px;padding:6px 6px 24px;box-shadow:0 0 0 3px var(--blau),5px 6px 0 3px var(--blau)}",
  "border:3px solid var(--blau);border-radius:var(--r-gross);padding:3px 3px 21px;box-shadow:var(--sch-hart)}"),
 (".handy-rahmen img{width:100%;border-radius:15px;", ".handy-rahmen img{width:100%;border-radius:var(--r-karte);"),
 ("  .handy-rahmen{border-radius:26px;padding:9px 9px 30px}\n  .handy-rahmen img{border-radius:19px}", "  .handy-rahmen{padding:6px 6px 27px}"),
 ("  .handy-rahmen{border-radius:18px;padding:5px 5px 20px}", "  .handy-rahmen{border-radius:var(--r-karte);padding:2px 2px 17px}"),
 (".stempel-schild{display:inline-block;background:var(--blau);color:var(--gelb);font:400 17px/1 var(--anzeige);text-transform:uppercase;padding:8px 14px 5px;border-radius:6px;transform:rotate(-3deg);box-shadow:3px 3px 0 var(--gelb)}",
  ".stempel-schild{display:inline-block;background:var(--blau);color:var(--gelb);font:400 var(--f-ui)/1 var(--anzeige);text-transform:uppercase;padding:8px 14px 5px;border-radius:var(--r-klein);transform:rotate(-3deg);box-shadow:3px 3px 0 var(--gelb)}"),
 ("font-size:14px;line-height:1.35;transform:rotate(2deg);box-shadow:4px 5px 0 rgba(31,61,92,.85)}", "font-size:var(--f-klein);line-height:1.35;transform:rotate(2deg);box-shadow:var(--sch-hart)}"),
 ("  .bon{font-size:15px;", "  .bon{font-size:var(--f-ui);"),
 ("box-shadow:0 0 0 3px var(--blau),4px 5px 0 3px var(--blau);transform:rotate(-2deg);transition:transform .2s;", "border:3px solid var(--blau);box-shadow:var(--sch-hart);transform:rotate(-2deg);transition:transform var(--ruhig);"),
 ("border-radius:44px 44px 18px 18px;", "border-radius:var(--r-gross) var(--r-gross) var(--r-karte) var(--r-karte);"),
 ("flex:0 0 26px;width:26px;transition:transform .25s}", "flex:0 0 26px;width:26px;transition:transform var(--ruhig)}"),
 ("border:2px solid var(--blau);border-radius:12px;padding:13px 14px;", "border:2px solid var(--blau);border-radius:var(--r-karte);padding:13px 14px;"),
 (".feld input:focus{outline:0;box-shadow:0 0 0 4px rgba(31,61,92,.25)}", ".feld input:focus{outline:3px solid var(--blau);outline-offset:2px}"),
 (".feld input[aria-invalid=true]{border-color:#a8231a;box-shadow:0 0 0 3px rgba(168,35,26,.15)}", ".feld input[aria-invalid=true]{border-color:#a8231a;border-width:3px}"),
 ("transform:translateY(110%);visibility:hidden;transition:transform .22s,visibility .22s}", "transform:translateY(110%);visibility:hidden;transition:transform var(--ruhig),visibility var(--ruhig)}"),
 ("border:4px solid var(--hell);border-radius:26px;overflow:hidden;background:var(--blau);box-shadow:6px 6px 0 var(--gelb)}", "border:4px solid var(--hell);border-radius:var(--r-gross);overflow:hidden;background:var(--blau);box-shadow:4px 5px 0 var(--gelb)}"),
 ("border-radius:14px;box-shadow:4px 4px 0 var(--blau);padding:14px 16px 13px;", "border-radius:var(--r-karte);box-shadow:var(--sch-hart);padding:14px 16px 13px;"),
 ("border:3px solid var(--blau);border-radius:14px;box-shadow:4px 4px 0 var(--blau);padding:12px 14px 12px 12px}", "border:3px solid var(--blau);border-radius:var(--r-karte);box-shadow:var(--sch-hart);padding:12px 14px 12px 12px}"),
 ("border-radius:14px;padding:14px 16px 15px;box-shadow:4px 5px 0 rgba(0,0,0,.25)}", "border-radius:var(--r-karte);padding:14px 16px 15px;box-shadow:4px 5px 0 rgba(0,0,0,.25)}"),
]
for alt, neu in R:
    n = s.count(alt)
    if n != 1:
        raise SystemExit(f"{n}× gefunden: {alt[:80]}")
    s = s.replace(alt, neu)
P.write_text(s, encoding="utf-8")
print("Schritt 1 ok")
