from lib import *

DEMOCAP = cap("Demo-Studio &middot; alle Daten erfunden", 18)
H = "font-family:'Bricolage Grotesque';font-weight:800;letter-spacing:-.02em;line-height:1.04"

# ---------- 01 Was ist Tattookalender (Karussell 5) ----------
def p01():
    n = "01-was-ist-tattookalender"; T = 5
    s = []
    s.append(page(f"{n}_1", sym(.08) + col(
        kick("Das Studio-System", 34) +
        f'<h1 style="font-size:116px">Weniger Orga.<br>Mehr Zeit an der <span class="g">Nadel.</span></h1>'
        '<div class="hair" style="width:200px;margin:64px 0 40px"></div>'
        '<p class="t" style="width:760px">Tattookalender ist das Studio-System für Tattoostudios.</p>', top=200), 1, T))
    s.append(page(f"{n}_2", col(
        kick("Kennst du das?", 34) +
        '<h2 style="font-size:92px">Fünf Apps, ein Terminbuch und ein Ordner.</h2>'
        '<div class="hair" style="width:200px;margin:64px 0 40px"></div>'
        '<p class="t" style="width:820px;color:#F4F1EA;font-size:40px">Und am Ende fehlt trotzdem die <span class="g">Anzahlung</span>.</p>'), 2, T))
    rows = ["Kalender je Artist", "Online-Buchung, Anzahlung per Link", "Einwilligung am Tablet", "Ein Postfach für WhatsApp und Instagram", "Ratenzahlung für große Projekte"]
    lis = "".join(f'<div style="border-top:1.5px solid #2C2822;height:132px;display:flex;align-items:center;gap:34px"><span class="num" style="font-size:48px;width:60px">{i+1}</span><span style="{H};font-size:46px">{r}</span></div>' for i, r in enumerate(rows))
    s.append(page(f"{n}_3", col(
        kick("Die Lösung", 22) + '<h2 style="font-size:78px;margin-bottom:48px">Alles in einem <span class="g">System.</span></h2>' + lis +
        cap("Welche Funktion in welchem Paket steckt, steht auf tattookalender.de.", 30)), 3, T))
    a, ah = shot("site/heute.jpg", 298, 508, 850, 440, 912, flow=True)
    s.append(page(f"{n}_4", col(
        kick("Dein Alltag", 22) + '<h2 style="font-size:78px;margin-bottom:56px">Dein Tag auf einen Blick.</h2>' + a +
        '<p class="s" style="margin-top:40px">Welche Termine heute anstehen, wo die Einwilligung fehlt und welche Anzahlung noch offen ist.</p>' + DEMOCAP), 4, T))
    s.append(page(f"{n}_5", sym(.08) + col(
        kick("Mehr erfahren", 30) + '<h2 style="font-size:92px;margin-bottom:56px">Ab <span class="g">89 €</span> im Monat netto.</h2>'
        '<div style="font-size:38px;font-weight:500;display:flex;flex-direction:column;gap:28px">'
        '<div class="chk"><i></i><span>0 % Provision</span></div><div class="chk"><i></i><span>Keine Einrichtungsgebühr</span></div>'
        '<div class="chk"><i></i><span>Wir richten dein Studio mit dir ein</span></div></div>'
        '<p class="s" style="margin-top:64px;color:#F4F1EA">Mehr: Link in der Bio &middot; tattookalender.de</p>'
        + cap("89 € bei jährlicher Zahlung, monatlich 99 €. Alle Preise netto zzgl. USt.", 36)), 5, T, last=True))
    return n, s

# ---------- 02 Kalender je Artist (Einzel) ----------
def p02():
    n = "02-kalender-je-artist"
    a, ah = shot("site/kalender-tag.jpg", 296, 108, 1290, 690, 1000, flow=True)
    pg = page(f"{n}_1", col(
        kick("Kalender", 24) + '<h1 style="font-size:100px;margin-bottom:60px">Ein Kalender für <span class="g">jeden Artist.</span></h1>' +
        f'<div style="margin-left:-44px">{a}</div>' +
        '<p class="s" style="margin-top:44px">Tag, Woche, Monat und eine eigene Ansicht fürs Handy. Doppelbuchungen sind gesperrt.</p>' + DEMOCAP, top=190, bottom=90), foot=False)
    return n, [pg]

# ---------- 03 Problem/Lösung: Leerer Stuhl ----------
def p03():
    n = "03-leerer-stuhl"
    pg = page(f"{n}_1", col(
        kick("Der leere Stuhl", 28) +
        '<div class="card" style="padding:52px 56px 56px">'
        '<div style="display:flex;justify-content:space-between;align-items:center"><span class="cap" style="letter-spacing:.14em;text-transform:uppercase;color:#EF6F6F;font-weight:600">Ohne System</span><span class="cap" style="font-size:26px">10:00</span></div>'
        f'<div style="{H};font-size:68px;margin-top:30px">Der Stuhl ist frei. Die Kundin kommt nicht.</div>'
        '<div style="margin-top:28px;font-size:30px;color:#A7A39A">Kein Anruf. Keine Anzahlung.</div></div>'
        '<div style="display:flex;align-items:center;gap:20px;color:#C9A24F;font-size:22px;font-weight:600;letter-spacing:.2em;margin:36px 0"><span>DANN LIEBER SO</span><span style="flex:1;height:2px;background:linear-gradient(90deg,#C9A24F,rgba(201,162,79,0))"></span></div>'
        '<div style="padding:52px 56px 56px;border-radius:30px;border:2px solid #C9A24F;background:linear-gradient(180deg,rgba(243,216,145,.12),rgba(201,162,79,.03))">'
        '<span class="cap" style="letter-spacing:.14em;text-transform:uppercase;color:#C9A24F;font-weight:600">Mit Tattookalender</span>'
        f'<div style="{H};font-size:60px;margin-top:28px">Ein Termin ist erst bestätigt, wenn die Anzahlung da ist.</div>'
        '<div style="margin-top:28px;font-size:30px;color:#A7A39A;line-height:1.4">Dazu Erinnerungen vor dem Termin.</div></div>', top=190, bottom=110), foot=False)
    return n, [pg]

# ---------- 04 Online-Buchung mit Anzahlung (Karussell 5) ----------
def p04():
    n = "04-buchung-mit-anzahlung"; T = 5
    s = []
    ph, phh = phone("site/anzahlung.png", 0, 0, 780, 1688, 540, 500, 250)
    s.append(page(f"{n}_1", ph + col(
        kick("Anzahlung", 28) + '<h1 style="font-size:70px;line-height:1.04">Gebucht ist, wenn die <span class="g">Anzahlung</span> da ist.</h1>', top=200, bottom=110, width=400)
        + '<div class="abs" style="left:84px;bottom:70px;font-size:22px;font-weight:500;color:#A7A39A">tattookalender.de</div>'
        + '<div class="abs sw" style="left:84px;bottom:120px;font-size:22px;font-weight:600;color:#C9A24F">Wischen &rarr;</div>', 1, T, foot=False))
    def step(i, title, text):
        return col(f'<div class="num" style="font-size:210px;line-height:.95;margin-bottom:30px">{i}</div>'
                   f'<h2 style="font-size:76px;margin-bottom:40px">{title}</h2><p class="t" style="width:880px">{text}</p>', top=200)
    s.append(page(f"{n}_2", step(1, "Du legst den Termin an.", "Im Kalender, aus einer Anfrage oder nach der Beratung, die deine Kundin online gebucht hat."), 2, T))
    c, ch = shot("site/anzahlung.png", 0, 170, 780, 470, 760, flow=True)
    s.append(page(f"{n}_3", col(
        f'<div style="display:flex;gap:34px;align-items:center;margin-bottom:56px"><span class="num" style="font-size:130px;line-height:1">2</span><h2 style="font-size:66px">Sie bekommt einen Bezahllink.</h2></div>' +
        f'<div style="align-self:center">{c}</div>' +
        '<p class="s" style="margin-top:40px;text-align:center">Mit Termin, Artist und Betrag.</p>' + f'<div style="text-align:center">{cap("Beispiel mit erfundenen Daten", 14)}</div>', top=190), 3, T))
    c, ch = shot("site/anzahlung.png", 40, 790, 700, 620, 720, flow=True)
    s.append(page(f"{n}_4", col(
        f'<div style="display:flex;gap:34px;align-items:center;margin-bottom:48px"><span class="num" style="font-size:130px;line-height:1">3</span><h2 style="font-size:66px">Deine Regeln stehen schon drin.</h2></div>' +
        f'<div style="align-self:center">{c}</div>' +
        '<p class="s" style="margin-top:36px;text-align:center">Die Kundin bestätigt sie per Häkchen, bevor sie zahlt.</p>' + f'<div style="text-align:center">{cap("Beispiel mit erfundenen Daten", 14)}</div>', top=190, bottom=130), 4, T))
    s.append(page(f"{n}_5", sym(.08) + col(
        '<div class="num" style="font-size:210px;line-height:.95;margin-bottom:30px">4</div>'
        '<h2 style="font-size:76px;margin-bottom:40px">Der Termin ist <span class="g">bestätigt.</span></h2>'
        '<p class="t" style="width:860px">Das Geld geht direkt auf dein Stripe-Konto. Wir nehmen 0 % Provision.</p>'
        '<p class="s" style="margin-top:70px;color:#F4F1EA">Mehr: Link in der Bio &middot; tattookalender.de</p>'
        + cap("Anzahlung ab dem Paket „Kalender + Zahlungen“.", 40), top=200), 5, T, last=True))
    return n, s

# ---------- 05 Statement (ivory) ----------
def p05():
    n = "05-du-bist-kuenstler"
    pg = page(f"{n}_1", col(
        kick("Tattookalender", 34) +
        '<h1 style="font-size:122px">Du bist <span class="g">Künstler.</span><br>Dein Kalender sollte mitarbeiten.</h1>'
        '<div class="hair" style="width:200px;margin:64px 0 36px;background:linear-gradient(90deg,#8A6418,rgba(138,100,24,0))"></div>'
        '<p class="t" style="width:860px;font-size:30px">Anfrage, Termin, Anzahlung, Einwilligung und Chat in einem System, das dein ganzes Team benutzt.</p>', top=190, bottom=100), light=True, foot=False)
    return n, [pg]

# ---------- 06 Erinnerung (Einzel) ----------
def p06():
    n = "06-erinnerung-24h-3h"
    pg = page(f"{n}_1", col(
        kick("Erinnerungen", 24) + '<h1 style="font-size:94px;margin-bottom:64px">Erinnert, ohne dass du <span class="g">daran denkst.</span></h1>'
        '<div style="border-radius:34px;background:#17150f;border:1.5px solid #3b3427;box-shadow:0 50px 100px rgba(0,0,0,.55);padding:44px 48px">'
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:24px;color:#A7A39A;font-weight:500"><span style="display:flex;align-items:center;gap:14px"><img src="../assets/logo/tattookalender-symbol-gold.png" style="width:36px"><span>Nadelwerk Würzburg</span></span><span>gestern, 10:00</span></div>'
        '<div style="font-size:42px;line-height:1.3;margin-top:30px;font-weight:500">Hey Lina, morgen um 10:00 ist dein Termin bei Mia Roth. Kommst du?</div>'
        '<div style="display:flex;gap:20px;margin-top:38px"><span style="flex:1;text-align:center;padding:24px 0;border-radius:18px;background:linear-gradient(180deg,#F3D891,#C9A24F);color:#0B0B0D;font-weight:600;font-size:30px">Ich komme</span>'
        '<span style="flex:1;text-align:center;padding:24px 0;border-radius:18px;border:1.5px solid #3b3427;font-weight:600;font-size:30px">Ich muss verschieben</span></div></div>'
        '<div style="display:flex;gap:18px;margin-top:44px"><span class="chip" style="color:#F4F1EA;border-color:#C9A24F;font-size:24px">7 Tage vorher</span><span class="chip" style="color:#F4F1EA;border-color:#C9A24F;font-size:24px">2 Tage vorher</span><span class="chip" style="color:#F4F1EA;border-color:#C9A24F;font-size:24px">1 Tag vorher</span></div>'
        '<p class="s" style="margin-top:28px">Die Antwort landet direkt am Termin.</p>'
        + cap("Beispiel mit erfundenen Daten. Antwort-Knöpfe per WhatsApp im Paket Komplett, sonst Erinnerung per E-Mail.", 30), top=190, bottom=90), foot=False)
    return n, [pg]

ALL = [p01, p02, p03, p04, p05, p06]
if __name__ == "__main__":
    for f in ALL:
        n, s = f(); print(n, len(s))
