from lib import *

DEMOCAP = cap("Demo-Studio &middot; alle Daten erfunden", 18)
H = "font-family:'Bricolage Grotesque';font-weight:800;letter-spacing:-.02em;line-height:1.04"
PILL = "display:inline-block;padding:26px 44px;border-radius:999px;background:linear-gradient(180deg,#F3D891,#C9A24F);color:#0B0B0D;font-weight:600;font-size:30px"

# ---------- 07 Papier vs. Tablet (P/L) ----------
def p07():
    n = "07-einwilligung-tablet"
    ph, _ = shot("site/einwilligung.png", 0, 0, 780, 620, 270, flow=True, radius=26)
    pg = page(f"{n}_1", col(
        kick("Einwilligung", 28) +
        '<div style="background:#F4F1EA;color:#0B0B0D;border-radius:30px;padding:50px 56px 54px;transform:rotate(-1deg);box-shadow:0 30px 70px rgba(0,0,0,.5)">'
        '<span class="cap" style="letter-spacing:.14em;text-transform:uppercase;color:#8A6418;font-weight:600">Auf Papier</span>'
        f'<div style="{H};font-size:62px;margin-top:24px">Einwilligung auf Papier, irgendwo zwischen den Rechnungen.</div></div>'
        '<div style="display:flex;align-items:center;gap:20px;color:#C9A24F;font-size:22px;font-weight:600;letter-spacing:.2em;margin:40px 0 34px"><span>BESSER SO</span><span style="flex:1;height:2px;background:linear-gradient(90deg,#C9A24F,rgba(201,162,79,0))"></span></div>'
        '<div style="padding:46px 50px;border-radius:30px;border:2px solid #C9A24F;background:linear-gradient(180deg,rgba(243,216,145,.12),rgba(201,162,79,.03));display:flex;gap:30px;align-items:center">'
        '<div style="flex:1"><span class="cap" style="letter-spacing:.14em;text-transform:uppercase;color:#C9A24F;font-weight:600">Am Tablet</span>'
        f'<div style="{H};font-size:46px;margin:20px 0 26px">Lesen, prüfen, unterschreiben.</div>'
        '<div style="display:flex;flex-direction:column;gap:16px;font-size:26px;line-height:1.3;color:#F4F1EA">'
        '<div class="chk" style="font-size:26px;gap:16px"><i style="width:30px;height:30px"></i><span>Kein Check-in ohne Einwilligung</span></div>'
        '<div class="chk" style="font-size:26px;gap:16px"><i style="width:30px;height:30px"></i><span>Unter 18 wird blockiert</span></div>'
        '<div class="chk" style="font-size:26px;gap:16px"><i style="width:30px;height:30px"></i><span>Danach nicht mehr änderbar</span></div></div></div>'
        f'<div style="width:270px;flex:none">{ph}</div></div>'
        + cap("Im Studio am Tablet oder vorher auf dem Handy. Beispiel mit erfundenen Daten.", 22), top=185, bottom=90), foot=False)
    return n, [pg]

# ---------- 08 Postfach (Karussell 5) ----------
def p08():
    n = "08-ein-postfach"; T = 5
    s = []
    a, ah = shot("site/chat.jpg", 300, 0, 1273, 700, 1000, flow=True, radius=26)
    s.append(page(f"{n}_1", col(
        kick("Ein Postfach", 24) + '<h1 style="font-size:88px;margin-bottom:52px">WhatsApp und Instagram an <span class="g">einem Ort.</span></h1>' +
        f'<div style="margin-left:-44px;margin-right:-44px;width:1000px">{a}</div>' + DEMOCAP, top=200, bottom=150), 1, T))
    s.append(page(f"{n}_2", col(
        kick("Instagram &middot; 23:14", 34) + '<h2 style="font-size:100px">„Was kostet ein Tattoo?“</h2>'
        '<div class="hair" style="width:200px;margin:60px 0 40px"></div>'
        '<p class="t" style="color:#F4F1EA;font-size:40px;width:800px">Zum vierten Mal heute, diesmal nachts.</p>'
        '<p class="s" style="margin-top:28px">Kennst du das?</p>'), 2, T))
    c, ch = shot("site/chat.jpg", 300, 0, 945, 560, 912, flow=True)
    s.append(page(f"{n}_3", col(
        kick("Fürs ganze Team", 22) + '<h2 style="font-size:78px;margin-bottom:52px">WhatsApp, Instagram und Facebook.</h2>' + c +
        '<p class="s" style="margin-top:40px">Alle Nachrichten landen im selben Postfach. Dein ganzes Team sieht, was offen ist.</p>' + DEMOCAP, top=190), 3, T))
    d, dh = shot("site/chat.jpg", 1245, 0, 328, 440, 400, flow=True)
    s.append(page(f"{n}_4", col(
        kick("Vom Chat zum Termin", 22) + '<h2 style="font-size:66px;margin-bottom:40px">Aus dem Chat direkt Termin anlegen.</h2>' +
        f'<div style="align-self:center">{d}</div>' +
        '<p class="s" style="margin-top:40px;text-align:center">Oder einen Zahlungslink senden. Ohne die App zu wechseln.</p>' + f'<div style="text-align:center">{DEMOCAP}</div>', top=200, bottom=130), 4, T))
    s.append(page(f"{n}_5", sym(.08) + col(
        kick("Mehr als ein Postfach", 30) + '<h2 style="font-size:80px;margin-bottom:56px">Antworten, ohne zu tippen.</h2>'
        '<div style="font-size:34px;display:flex;flex-direction:column;gap:26px;font-weight:500">'
        '<div class="chk"><i></i><span>Eigene WhatsApp-Nummer für dein Studio</span></div>'
        '<div class="chk"><i></i><span>Bots, Vorlagen und KI-Antwortvorschläge</span></div>'
        '<div class="chk"><i></i><span>Erinnerungen und Anzahlungslinks automatisch per WhatsApp</span></div></div>'
        '<p class="s" style="margin-top:56px;color:#F4F1EA">Mehr: Link in der Bio &middot; tattookalender.de</p>'
        + cap("Im Paket „Komplett mit eigenem Chat“: 299 € im Monat netto, jährlich 269 € im Monat.", 34), top=190), 5, T, last=True))
    return n, s

# ---------- 09 Ratenzahlung (ivory, Einzel) ----------
def p09():
    n = "09-ratenzahlung"
    box = lambda a, b: (f'<div style="flex:1;background:#fff;border:1.5px solid #DDD7C8;border-radius:26px;padding:34px 28px;min-height:190px">'
                        f'<div class="cap" style="color:#8A6418;font-weight:600;letter-spacing:.1em;text-transform:uppercase;font-size:19px">{a}</div>'
                        f'<div style="{H};font-size:36px;margin-top:14px">{b}</div></div>')
    arrow = '<div style="flex:none;font-size:44px;color:#8A6418;font-weight:600;padding:0 14px">&rarr;</div>'
    pg = page(f"{n}_1", col(
        kick("Ratenzahlung", 30) + '<h1 style="font-size:104px">Große Projekte in <span class="g">Monatsraten.</span></h1>'
        '<p class="t" style="margin-top:44px;width:860px">Dein Kunde zahlt in Raten, du bekommst dein Geld direkt auf dein Stripe-Konto.</p>'
        f'<div style="display:flex;align-items:center;margin-top:70px">{box("Tattoofin","Monatsraten für Kunden")}{arrow}{box("Dein Konto","Stripe, ohne Umweg")}{arrow}{box("Tattookalender","Ratenplan bei den Zahlungen")}</div>'
        + cap("Tattoofin ist ein eigenes Angebot mit eigenem Vertrag. Ratenzahlung ab dem Paket „Kalender + Zahlungen“.", 50), top=185, bottom=90), light=True, foot=False)
    return n, [pg]

# ---------- 10 Preise (Karussell 5) ----------
def p10():
    n = "10-preise"; T = 5
    s = []
    s.append(page(f"{n}_1", sym(.08) + col(
        kick("Preise", 34) + '<h1 style="font-size:112px">Ein Preis pro <span class="g">Studio.</span></h1>'
        '<div class="hair" style="width:200px;margin:60px 0 40px"></div>'
        '<p class="t" style="width:800px">Drei Pakete, keine Einrichtungsgebühr, 0 % Provision. Ab 89 € im Monat netto.</p>'
        + cap("89 € bei jährlicher Zahlung. Alle Preise netto zzgl. 19 % USt. Nur für Unternehmen.", 40), top=190), 1, T))
    def paket(i, name, sub, price, yearly, items, badge=""):
        b = f'<span class="chip" style="color:#C9A24F;border-color:#C9A24F;margin-bottom:30px;align-self:flex-start">{badge}</span>' if badge else '<div style="height:0"></div>'
        its = "".join(f'<div class="chk" style="font-size:30px;gap:20px"><i style="width:34px;height:34px"></i><span>{x}</span></div>' for x in items)
        return page(f"{n}_{i}", col(
            b + kick(name, 14) + f'<div style="{H};font-size:56px;color:#A7A39A;font-weight:600;margin-bottom:34px;font-size:40px">{sub}</div>'
            f'<div style="display:flex;align-items:baseline;gap:22px"><span class="num" style="font-size:190px;line-height:1">{price} €</span></div>'
            f'<div class="s" style="font-size:28px;color:#A7A39A;margin:14px 0 44px">im Monat, netto zzgl. USt.<br>Jährlich bezahlt: {yearly} € im Monat.</div>'
            '<div class="hair" style="width:100%;opacity:.5;margin-bottom:40px"></div>'
            f'<div style="display:flex;flex-direction:column;gap:24px">{its}</div>', top=190), i, T)
    s.append(paket(2, "Kalender", "Termine, Kunden und Einwilligung an einem Ort.", "99", "89",
                   ["Kalender je Artist und Station, auch fürs Handy", "Online-Buchung von Beratungsterminen", "Einwilligung und Aufklärung am Tablet", "Erinnerungen 24 h und 3 h vorher per E-Mail"]))
    s.append(paket(3, "Kalender + Zahlungen", "Dazu Geld vor dem Termin, ohne Provision.", "169", "149",
                   ["Alles aus „Kalender“", "Anzahlung direkt bei der Buchung", "Zahlungslinks und Restzahlung", "Ratenzahlung für große Projekte (Tattoofin)", "Provision je Artist, Belege, DATEV-Export"]))
    s.append(paket(4, "Komplett mit eigenem Chat", "Dazu ein Postfach für WhatsApp, Instagram und Facebook.", "299", "269",
                   ["Alles aus „Kalender + Zahlungen“", "WhatsApp-Postfach mit eigener Nummer", "Instagram- und Facebook-Nachrichten", "Bots, Vorlagen und KI-Antwortvorschläge", "Kasse mit TSE"], badge="Unsere Empfehlung"))
    s.append(page(f"{n}_5", col(
        kick("In jedem Paket", 22) + '<h2 style="font-size:70px;margin-bottom:44px">Das ist immer dabei.</h2>'
        '<div style="display:flex;flex-direction:column;gap:24px;font-size:32px;font-weight:500">'
        '<div class="chk"><i></i><span>1 Standort, bis 5 Artists</span></div><div class="chk"><i></i><span>Unbegrenzt Logins, Termine und Kunden</span></div>'
        '<div class="chk"><i></i><span>0 % Provision auf Zahlungen</span></div><div class="chk"><i></i><span>Keine Einrichtungsgebühr</span></div></div>'
        '<div class="card" style="margin-top:56px;padding:36px 42px;border-color:#C9A24F"><span class="cap" style="letter-spacing:.14em;text-transform:uppercase;color:#C9A24F;font-weight:600">Alles aus einer Hand</span>'
        f'<div style="{H};font-size:40px;margin:14px 0 12px">1.399 € im Monat, netto zzgl. USt.</div>'
        '<div style="font-size:24px;line-height:1.4;color:#A7A39A">TattooLeadz, Tattookalender und Tattoofin zusammen. Nur auf Anfrage. Das Werbebudget zahlst du direkt an Meta.</div></div>'
        + cap("Jeder weitere Artist ab Nummer 6: 9 € im Monat. Mehr: Link in der Bio.", 28), top=190), 5, T, last=True))
    return n, s

# ---------- 11 Zettelwirtschaft vs. System (P/L, geteilt) ----------
def p11():
    n = "11-zettelwirtschaft-vs-system"
    row = lambda a, b: (f'<div style="display:flex;gap:22px;align-items:baseline;border-top:1.5px solid #D6CFBE;padding:17px 0"><span style="font-weight:600;font-size:22px;letter-spacing:.08em;text-transform:uppercase;color:#8A6418;width:170px;flex:none">{a}</span>'
                        f'<span style="font-size:29px;line-height:1.3;font-weight:500;color:#0B0B0D">{b}</span></div>')
    body = ('<div class="abs" style="left:0;top:0;width:1080px;height:690px;background:#F4F1EA;color:#0B0B0D"></div>'
            '<div class="abs" style="left:0;top:690px;width:1080px;height:2px;background:linear-gradient(90deg,#C9A24F,#F3D891,#C9A24F)"></div>'
            '<div class="abs" style="left:84px;top:84px;width:912px">'
            '<div style="font-weight:600;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:#8A6418;margin-bottom:22px">Vorher</div>'
            f'<h2 style="font-size:64px;color:#0B0B0D;margin-bottom:26px">Fünf Apps, ein Terminbuch, ein Ordner.</h2>'
            + row("Instagram", "Preisfragen mitten in der Nacht") + row("Terminbuch", "Wer hat den Termin eingetragen?") + row("PayPal", "Anzahlung? Vielleicht.") + row("Ordner", "Einwilligung auf Papier") + '</div>'
            '<div class="abs" style="left:84px;top:760px;width:912px">'
            '<div class="kick" style="margin-bottom:22px">Nachher</div>'
            f'<h2 style="font-size:84px;margin-bottom:46px">Ein System <span class="g">für alles.</span></h2>'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:34px 30px;font-size:31px;font-weight:500">'
            '<div class="chk" style="font-size:31px;gap:16px"><i style="width:36px;height:36px"></i><span>Kalender je Artist</span></div>'
            '<div class="chk" style="font-size:31px;gap:16px"><i style="width:36px;height:36px"></i><span>Anzahlung vorab</span></div>'
            '<div class="chk" style="font-size:31px;gap:16px"><i style="width:36px;height:36px"></i><span>Einwilligung am Tablet</span></div>'
            '<div class="chk" style="font-size:31px;gap:16px"><i style="width:36px;height:36px"></i><span>Ein Postfach fürs Team</span></div></div></div>'
            '<img class="abs" src="../assets/logo/tattookalender-logo-quer-kompakt-dunkel.png" style="left:84px;bottom:70px;height:40px">'
            '<div class="abs" style="right:84px;bottom:78px;font-size:22px;font-weight:500;color:#A7A39A">tattookalender.de</div>')
    return n, [page(f"{n}_1", body, logo=False, foot=False)]

# ---------- 12 Tipps (Karussell 5) ----------
def p12():
    n = "12-vier-wege-gegen-leere-stuehle"; T = 5
    s = []
    s.append(page(f"{n}_1", sym(.08) + col(
        kick("Studioalltag", 34) + '<h1 style="font-size:118px"><span class="g">4 Wege</span> gegen leere Stühle.</h1>'
        '<div class="hair" style="width:200px;margin:60px 0 40px"></div><p class="t" style="width:760px">Ohne Tricks. Einfach sauber organisiert.</p>', top=190), 1, T))
    tips = [("Anzahlung zur Bedingung machen.", "Ein Termin ist erst fest, wenn die Anzahlung da ist. Das macht ihn verbindlich, für beide Seiten."),
            ("Absageregeln vorher klar sagen.", "Bis wann darf abgesagt werden? Was passiert mit der Anzahlung? Schreib es auf und lass es vor dem Bezahlen bestätigen."),
            ("Erinnern, bevor jemand vergisst.", "Eine Nachricht am Vortag und eine kurz vor dem Termin. Mit zwei Antworten: Ich komme. Ich muss verschieben."),
            ("Freie Termine schnell neu vergeben.", "Wer verschiebt, macht Platz. Eine Warteliste füllt die Lücke, bevor der Stuhl leer bleibt.")]
    for i, (t, d) in enumerate(tips, 1):
        last = i == 4
        extra = ('<p class="s" style="margin-top:64px;color:#F4F1EA">Alle vier laufen im Tattookalender mit.<br>Mehr: Link in der Bio &middot; tattookalender.de</p>' if last else "")
        s.append(page(f"{n}_{i+1}", (sym(.08) if last else "") + col(
            f'<div class="num" style="font-size:210px;line-height:.95;margin-bottom:30px">{i}</div><h2 style="font-size:72px;margin-bottom:40px">{t}</h2><p class="t" style="width:880px">{d}</p>' + extra, top=190), i + 1, T, last=last))
    return n, s

# ---------- 13 Handy-Kalender (Einzel) ----------
def p13():
    n = "13-handy-kalender"
    ph, _ = phone("demo/demo-kalender.jpg", 0, 0, 780, 1688, 560, 262, 640)
    pg = page(f"{n}_1", ph + col(
        kick("Auf dem Handy", 24) + '<h1 style="font-size:100px">Dein Kalender in der <span class="g">Hosentasche.</span></h1>'
        '<p class="s" style="margin-top:30px;width:800px">Eine eigene Ansicht fürs Handy. Du siehst, was heute ansteht und was noch fehlt.</p>', top=190, bottom=0, justify="flex-start")
        + '<div class="abs cap" style="left:84px;bottom:70px;width:170px;line-height:1.4">Demo-Studio, erfundene Daten</div>', foot=False)
    return n, [pg]

# ---------- 14 FAQ (Karussell 5) ----------
def p14():
    n = "14-haeufige-fragen"; T = 5
    s = []
    s.append(page(f"{n}_1", sym(.08) + col(
        kick("Fragen und Antworten", 34) + '<h1 style="font-size:118px">Häufige <span class="g">Fragen.</span></h1>'
        '<div class="hair" style="width:200px;margin:60px 0 40px"></div><p class="t" style="width:760px">Was Studios vor dem Start wissen wollen.</p>', top=190), 1, T))
    qa = [[("Kostet die Einrichtung extra?", "Nein. Es gibt keine Einrichtungsgebühr. Wir richten dein Studio mit dir ein und übernehmen deine Kunden und Termine aus Planity oder Excel."),
           ("Was kosten Zahlungen?", "Wir nehmen 0 % Provision. Zahlungen laufen über dein eigenes Stripe-Konto, das Geld geht direkt an dich. Stripe berechnet seine Gebühr selbst.")],
          [("Wie lange bin ich gebunden?", "Monatlich bezahlt: gar nicht, du kündigst zum Ende des Abrechnungsmonats. Jährlich bezahlt: 12 Monate Mindestlaufzeit, dafür 10 % günstiger."),
           ("Wie viele Leute dürfen sich einloggen?", "So viele, wie in deinem Studio arbeiten. In jedem Paket: 1 Standort, bis 5 Artists. Ab Artist Nummer 6 kostet jeder 9 € im Monat.")],
          [("Was passiert mit Gesundheitsdaten?", "Angaben aus der Einwilligung sehen nur Inhaber und Studioleitung. Jeder Zugriff wird protokolliert. Die Datenbank liegt in Frankfurt."),
           ("Für wen ist der Tattookalender?", "Für Tattoostudios und Ketten, also für Unternehmen. Verträge mit Privatpersonen schließen wir nicht. Alle Preise sind netto.")]]
    for k, pair in enumerate(qa):
        blocks = "".join(f'<div style="{"" if j == 0 else "margin-top:56px;padding-top:56px;border-top:1.5px solid #2C2822"}"><h3 style="font-size:50px;color:#F4F1EA"><span class="g">{"Q" if False else ""}</span>{q}</h3><p class="s" style="margin-top:20px;font-size:33px;line-height:1.45">{a}</p></div>' for j, (q, a) in enumerate(pair))
        s.append(page(f"{n}_{k+2}", col(kick(f"Frage {2*k+1} und {2*k+2}", 34) + blocks, top=190), k + 2, T))
    s.append(page(f"{n}_5", sym(.08) + col(
        kick("Noch etwas offen?", 30) + '<h2 style="font-size:88px;margin-bottom:44px">Schreib uns <span class="g">per WhatsApp.</span></h2>'
        '<p class="t" style="width:820px">Wir zeigen dir den Tattookalender in einem kurzen Gespräch. Kostenlos und ohne Verpflichtung.</p>'
        '<p class="s" style="margin-top:70px;color:#F4F1EA">Mehr: Link in der Bio &middot; tattookalender.de</p>', top=190), 5, T, last=True))
    return n, s

# ---------- 15 So startest du / Abschluss (ivory, Karussell 4) ----------
def p15():
    n = "15-so-startest-du"; T = 4
    s = []
    s.append(page(f"{n}_1", f'<img class="abs" src="../assets/logo/tattookalender-logo-gestapelt-hell.png" style="left:270px;top:330px;width:540px">'
        + col('<div style="flex:1"></div><div style="text-align:center"><h2 style="font-size:72px;color:#0B0B0D">Mehr Zeit an der <span class="g">Nadel.</span></h2>'
              '<p class="t" style="margin-top:26px;font-size:30px">Lass dir den Tattookalender zeigen. Link in der Bio.</p></div>', top=800, bottom=140), 1, T, light=True, logo=False))
    steps = [("Paket wählen.", "Direkt über Stripe kaufen, monatlich oder jährlich. Oder erst eine kostenlose Beratung per WhatsApp."),
             ("Einrichten mit uns.", "Wir legen Artists, Plätze, Arbeitszeiten und Anzahlungsregeln an und ziehen deine Kunden und Termine um."),
             ("Team einladen.", "Du lädst dein Team ein, verbindest dein Stripe-Konto, und die nächste Anfrage läuft schon durch den Tattookalender.")]
    for i, (t, d) in enumerate(steps, 1):
        last = i == 3
        extra = (f'<div style="margin-top:64px"><span style="{PILL}">Link in der Bio &middot; tattookalender.de</span></div>' if last else "")
        s.append(page(f"{n}_{i+1}", col(
            kick("So startest du", 18) + f'<div class="num" style="font-size:210px;line-height:.95;margin-bottom:30px">{i}</div><h2 style="font-size:76px;margin-bottom:40px">{t}</h2><p class="t" style="width:880px">{d}</p>' + extra, top=190), i + 1, T, light=True, last=last))
    return n, s

ALL = [p07, p08, p09, p10, p11, p12, p13, p14, p15]
if __name__ == "__main__":
    for f in ALL:
        n, s = f(); print(n, len(s))
