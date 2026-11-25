import SwiftUI

// MARK: - Status-Chips

struct StatusChip: View {
    let text: String
    let farbe: Color

    /// Zahlungsstatus
    init(zahlung status: String) {
        let (t, f): (String, Color) = switch status {
        case "offen": ("Offen", .tfOrange)
        case "angezahlt": ("Angezahlt", .tfGruen)
        case "in_pruefung": ("In Prüfung", .tfOrange)
        case "bezahlt": ("Bezahlt", .tfGruen)
        case "storniert": ("Storniert", .tfLeise)
        case "abgebrochen": ("Abgebrochen", .tfLeise)
        case "fehlgeschlagen": ("Fehlgeschlagen", .tfRot)
        case "erstattet": ("Erstattet", .tfLeise)
        case "rueckgebucht": ("Zurückgebucht", .tfRot)
        default: (status, .tfLeise)
        }
        text = Self.grossAnfang(t)
        farbe = f
    }

    /// Gutscheinstatus
    init(gutschein status: String?) {
        let (t, f): (String, Color) = switch status {
        case "gueltig": ("Gültig", .tfGruen)
        case "eingeloest": ("Eingelöst", .tfLeise)
        case "abgelaufen": ("Abgelaufen", .tfRot)
        case "storniert": ("Storniert", .tfLeise)
        case "erstattet": ("Erstattet", .tfLeise)
        default: ("Noch nicht bezahlt", .tfOrange)
        }
        text = Self.grossAnfang(t)
        farbe = f
    }

    /// Auszahlungsstatus
    init(auszahlung a: Auszahlung) {
        let f: Color = switch a.status {
        case "paid": .tfGruen
        case "in_transit", "pending": .tfOrange
        case "failed": .tfRot
        default: .tfLeise
        }
        text = Self.grossAnfang(a.statusText ?? a.status)
        farbe = f
    }

    /// Eine Schreibweise für alle Chips (App-Texte und Server-Texte): großer Anfangsbuchstabe
    private static func grossAnfang(_ s: String) -> String {
        guard let erster = s.first else { return s }
        return erster.uppercased() + s.dropFirst()
    }

    var body: some View {
        Text(text)
            .font(.dm(.caption, weight: .bold))
            // Nie mitten im Wort umbrechen („Unterwe|gs“): Chip bleibt einzeilig, die Zeile drumherum ordnet sich um
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .foregroundStyle(farbe)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(farbe.opacity(0.12), in: Capsule())
            .overlay(Capsule().stroke(farbe.opacity(0.35), lineWidth: 1))
            .accessibilityLabel("Status: \(text)")
    }
}

// MARK: - Lade-, Leer- und Fehlerzustände

struct LadeAnsicht: View {
    var text: String = Texte.Allgemein.laedt

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text(text).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
    }
}

struct FehlerAnsicht: View {
    let text: String
    var nochmal: (() -> Void)?

    /// WLAN-Symbol nur, wenn wirklich das Internet fehlt; sonst ein allgemeines Warnzeichen
    static func symbol(_ text: String) -> String {
        text == Texte.Fehler.keinNetz ? "wifi.exclamationmark" : "exclamationmark.triangle"
    }

    var body: some View {
        ContentUnavailableView {
            Label(Texte.Fehler.titel, systemImage: Self.symbol(text))
                .font(.dm(.title3, weight: .bold))
        } description: {
            Text(text).font(.dm(.body))
        } actions: {
            if let nochmal {
                Button(Texte.Allgemein.nochmal, action: nochmal).buttonStyle(.zweit).frame(maxWidth: 240)
            }
        }
    }
}

struct LeerAnsicht: View {
    let titel: String
    let text: String
    var symbol: String = "tray"

    // Eigener Aufbau statt ContentUnavailableView: die setzt die Systemschrift durch, hier gilt DM Sans in Markenfarben
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 40, weight: .regular))  // ds-ok: Zier-Symbol im Leerzustand (40 pt), Titel und Text darunter wachsen mit
                .foregroundStyle(Color.tfLeise)
                .accessibilityHidden(true)
            Text(titel)
                .font(.dm(.title3, weight: .bold))
                .foregroundStyle(Color.tfTinte)
            Text(text)
                .font(.dm(.body))
                .foregroundStyle(Color.tfLeise)
        }
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .padding(.horizontal, 16)
        .accessibilityElement(children: .combine)
    }
}

/// Gelbe Hinweiskarte (Text immer Blau auf Gelb)
struct HinweisKarte: View {
    let text: String
    var symbol: String = "exclamationmark.triangle.fill"
    var schrift: Font = .dm(.subheadline, weight: .medium)

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol).accessibilityHidden(true)
            Text(text).font(schrift).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .foregroundStyle(Color.tfBlau)
        .padding(14)
        .background(Color.tfGelbHell, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

/// Kleine Zeile, wenn Daten da sind, das Aktualisieren aber nicht geklappt hat: „Aktualisieren hat nicht geklappt. Stand von 14:05.“
struct AktualisierenFehlerZeile: View {
    @Environment(PortalStore.self) private var portal

    var body: some View {
        if portal.studio != nil, portal.fehler != nil {
            Label(Texte.Fehler.aktualisierenFehlgeschlagen(portal.geladenAm.map { $0.formatted(date: .omitted, time: .shortened) }),
                  systemImage: FehlerAnsicht.symbol(portal.fehler ?? ""))
                .font(.dm(.footnote, weight: .medium))
                .foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier("aktualisieren-fehler")
        }
    }
}

/// Fehlermeldung unter einem Formular
struct FehlerZeile: View {
    let text: String

    var body: some View {
        Label(text, systemImage: "exclamationmark.circle.fill")
            .font(.dm(.subheadline, weight: .medium))
            .foregroundStyle(Color.tfRot)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityLabel("Fehler: \(text)")
    }
}

/// Fehlerzeile für einen Teil eines Bildschirms (DS „Teilweise“): Der Rest bleibt nutzbar, hier steht, was fehlt, mit „Nochmal versuchen“.
struct TeilFehlerZeile: View {
    let text: String
    let nochmal: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            FehlerZeile(text: text)
            Button(Texte.Allgemein.nochmal, action: nochmal)
                .font(.dm(.subheadline, weight: .semibold))
                .foregroundStyle(Color.tfAkzent)
        }
        .padding(.vertical, 4)
    }
}

/// Zeile „Bezeichnung – Wert“ in Details
struct WertZeile: View {
    let titel: String
    let wert: String

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline) {
                Text(titel).foregroundStyle(Color.tfLeise)
                Spacer(minLength: 12)
                Text(wert).foregroundStyle(Color.tfTinte).multilineTextAlignment(.trailing)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(titel).foregroundStyle(Color.tfLeise)
                Text(wert).foregroundStyle(Color.tfTinte)
            }
        }
        .font(.dm(.body))
        .accessibilityElement(children: .combine)
    }
}

/// Platzhalter im Eingabefeld in tfLeise (die Systemfarbe erreicht nur 1,7:1 hell bzw. 2,5:1 dunkel, tfLeise 6,5:1 bzw. 8,9:1; WCAG AA)
func tfPlatzhalter(_ text: String) -> Text {
    Text(text).foregroundStyle(Color.tfLeise)
}

/// Systemmenü „Teilen“ zum direkten Öffnen (z. B. sobald das Gutschein-PDF geladen ist)
struct TeilenSheet: UIViewControllerRepresentable {
    let dinge: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: dinge, applicationActivities: nil)
    }

    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

/// Liste in Markenfarben: Zeilen auf tfKarte (sonst nimmt iOS im Dunkelmodus Systemgrau statt Markenblau).
/// Zeilen mit eigenem .listRowBackground behalten ihren Hintergrund.
struct TFListe<Inhalt: View>: View {
    @ViewBuilder var inhalt: Inhalt

    var body: some View {
        List {
            inhalt.listRowBackground(Color.tfKarte)
        }
    }
}

/// Formular in Markenfarben (wie TFListe)
struct TFFormular<Inhalt: View>: View {
    @ViewBuilder var inhalt: Inhalt

    var body: some View {
        Form {
            inhalt.listRowBackground(Color.tfKarte)
        }
    }
}

/// Überschrift eines Listen-Abschnitts mit genug Kontrast (tfLeise, etwa 6:1). Der System-Standard (secondaryLabel) hat auf dem
/// Creme-Hintergrund nur 3,4:1 (WCAG 1.4.3 verlangt 4,5:1, Prüfung 14.11.2026).
struct ListenKopf: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).foregroundStyle(Color.tfLeise) }
}

/// Fußzeile eines Listen-Abschnitts mit genug Kontrast (wie ListenKopf)
struct ListenFuss: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).foregroundStyle(Color.tfLeise) }
}
