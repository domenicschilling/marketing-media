import SwiftUI
import SafariServices

// MARK: - Status-Chips

struct StatusChip: View {
    let text: String
    let farbe: Color

    /// Zahlungsstatus
    init(zahlung status: String) {
        let (t, f): (String, Color) = switch status {
        case "offen": ("offen", .tfOrange)
        case "in_pruefung": ("in Prüfung", .tfOrange)
        case "bezahlt": ("bezahlt", .tfGruen)
        case "storniert": ("storniert", .tfLeise)
        case "abgebrochen": ("abgebrochen", .tfLeise)
        case "fehlgeschlagen": ("fehlgeschlagen", .tfRot)
        case "erstattet": ("erstattet", .tfLeise)
        case "rueckgebucht": ("zurückgebucht", .tfRot)
        default: (status, .tfLeise)
        }
        text = t
        farbe = f
    }

    /// Gutscheinstatus
    init(gutschein status: String?) {
        let (t, f): (String, Color) = switch status {
        case "gueltig": ("gültig", .tfGruen)
        case "eingeloest": ("eingelöst", .tfLeise)
        case "abgelaufen": ("abgelaufen", .tfRot)
        case "storniert": ("storniert", .tfLeise)
        case "erstattet": ("erstattet", .tfLeise)
        default: ("noch nicht bezahlt", .tfOrange)
        }
        text = t
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
        text = a.statusText ?? a.status
        farbe = f
    }

    var body: some View {
        Text(text)
            .font(.dm(.caption, weight: .bold))
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

    var body: some View {
        ContentUnavailableView {
            Label(Texte.Fehler.titel, systemImage: "wifi.exclamationmark")
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

    var body: some View {
        ContentUnavailableView {
            Label(titel, systemImage: symbol).font(.dm(.title3, weight: .bold))
        } description: {
            Text(text).font(.dm(.body))
        }
    }
}

/// Gelbe Hinweiskarte (Text immer Blau auf Gelb)
struct HinweisKarte: View {
    let text: String
    var symbol: String = "exclamationmark.triangle.fill"

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol).accessibilityHidden(true)
            Text(text).font(.dm(.subheadline, weight: .medium)).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .foregroundStyle(Color.tfBlau)
        .padding(14)
        .background(Color.tfGelbHell, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
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

// MARK: - Safari im Sheet (Rechtstexte)

struct SafariAnsicht: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let c = SFSafariViewController(url: url)
        c.preferredControlTintColor = UIColor(hex: 0x1F3D5C)
        c.dismissButtonStyle = .close
        return c
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}

/// Identifizierbare URL für .sheet(item:)
struct WebSeite: Identifiable, Hashable {
    let url: URL
    var id: String { url.absoluteString }
}
