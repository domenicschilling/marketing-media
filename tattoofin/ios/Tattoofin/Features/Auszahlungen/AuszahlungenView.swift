import SwiftUI

/// Bildschirm 10: Saldo und Auszahlungen aufs Bankkonto (native Liste statt eingebettetem Stripe-Baustein)
struct AuszahlungenView: View {
    @State private var antwort: AuszahlungenAntwort?
    @State private var liste: [Auszahlung] = []
    @State private var fehler: String?
    @State private var laedtMehr = false

    var body: some View {
        TFListe {
            if let a = antwort {
                if a.konto?.verbunden == false {
                    Section {
                        LeerAnsicht(titel: Texte.Auszahlungen.keinKontoTitel,
                                    text: a.hinweis ?? Texte.Auszahlungen.keinKonto, symbol: "building.columns")
                    }
                } else {
                    if let s = a.saldo {
                        Section { SaldoKarte(saldo: s).listRowInsets(EdgeInsets()).listRowBackground(Color.clear) }
                    }
                    if a.konto?.auszahlungenAktiv == false {
                        Section { HinweisKarte(text: Texte.Auszahlungen.nichtAktiv).listRowInsets(EdgeInsets()).listRowBackground(Color.clear) }
                    }
                    Section {
                        if liste.isEmpty {
                            Text(a.hinweis ?? Texte.Auszahlungen.leer).font(.dm(.body)).foregroundStyle(Color.tfLeise)
                        }
                        ForEach(liste) { AuszahlungZeile(auszahlung: $0) }
                        if a.weitere == true {
                            Button {
                                Task { await mehrLaden() }
                            } label: {
                                HStack {
                                    Text(Texte.Auszahlungen.mehr)
                                    if laedtMehr { Spacer(); ProgressView() }
                                }
                            }
                            .disabled(laedtMehr)
                        }
                    } header: {
                        ListenKopf(Texte.Auszahlungen.listeTitel)
                    } footer: {
                        // Wann kommt mein Geld? (häufigste Frage neuer Studios)
                        Text(Texte.Kasse11.ersteAuszahlung)
                            .font(.dm(.footnote))
                            .foregroundStyle(Color.tfLeise)
                    }
                }
                if let fehler { Section { FehlerZeile(text: fehler) } }
            } else if let fehler {
                FehlerAnsicht(text: fehler) { Task { await laden() } }
                    .listRowBackground(Color.clear)
            } else {
                LadeAnsicht().frame(minHeight: 200).listRowBackground(Color.clear)
            }
        }
        .font(.dm(.body))
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .refreshable { await laden() }
        .task { await laden() }
    }

    private func laden() async {
        do {
            let a = try await APIClient.shared.auszahlungen()
            antwort = a
            liste = a.auszahlungen
            fehler = nil
        } catch is CancellationError {
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func mehrLaden() async {
        guard let nach = antwort?.nach ?? liste.last?.id else { return }
        laedtMehr = true
        defer { laedtMehr = false }
        do {
            let a = try await APIClient.shared.auszahlungen(nach: nach)
            liste += a.auszahlungen.filter { neu in !liste.contains { $0.id == neu.id } }
            antwort?.weitere = a.weitere
            antwort?.nach = a.nach
        } catch {
            fehler = fehlerText(error)
        }
    }
}

struct SaldoKarte: View {
    let saldo: Saldo
    @Environment(\.dynamicTypeSize) private var schrift

    var body: some View {
        // Bedienungshilfe-Größen: Werte untereinander mit waagerechter Linie (sonst brechen „Verfügbar“ und die Beträge mitten im Wort)
        let gross = schrift.isAccessibilitySize
        // Oben bündig: beide Beträge auf einer Linie, auch wenn eine Beschriftung zweizeilig ist
        let layout = gross ? AnyLayout(VStackLayout(spacing: 12)) : AnyLayout(HStackLayout(alignment: .top, spacing: 0))
        layout {
            spalte(Texte.Auszahlungen.verfuegbar, saldo.verfuegbarCent)
            if gross {
                Rectangle().fill(Color.tfBlau.opacity(0.25)).frame(height: 1).padding(.horizontal, 16)
            } else {
                Rectangle().fill(Color.tfBlau.opacity(0.25)).frame(width: 1).padding(.vertical, 6)
            }
            spalte(Texte.Auszahlungen.unterwegs, saldo.unterwegsCent)
        }
        .padding(.vertical, 16)
        .background(Color.tfGelb, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.tfBlau, lineWidth: 2))
    }

    private func spalte(_ titel: String, _ cent: Int) -> some View {
        VStack(spacing: 4) {
            GrosserBetrag.text(Euro.text(cent), groesse: 26, relativeTo: .title2)
                .foregroundStyle(Color.tfBlau)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text(titel)
                .font(.dm(.subheadline, weight: .semibold))
                .foregroundStyle(Color.tfBlau)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 8)
        .accessibilityElement(children: .combine)
    }
}

struct AuszahlungZeile: View {
    let auszahlung: Auszahlung
    @Environment(\.dynamicTypeSize) private var schrift

    var body: some View {
        // Bedienungshilfe-Größen: Status unter die Angaben statt daneben (wie GutscheinZeile)
        let gross = schrift.isAccessibilitySize
        let layout = gross ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6)) : AnyLayout(HStackLayout(alignment: .top))
        layout {
            VStack(alignment: .leading, spacing: 3) {
                Text(Euro.text(auszahlung.betragCent))
                    .font(.dm(.body, weight: .bold))
                    .foregroundStyle(Color.tfTinte)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                // Fehlgeschlagene/abgebrochene Auszahlungen kommen nicht an → kein Ankunftsdatum
                if !["failed", "canceled"].contains(auszahlung.status), let d = Datum.tag(auszahlung.ankunftAm) {
                    Text(auszahlung.status == "paid" ? Texte.Auszahlungen.angekommenAm(d) : Texte.Auszahlungen.ankunftAm(d))
                        .font(.dm(.subheadline))
                        .foregroundStyle(Color.tfLeise)
                }
                if let b = auszahlung.bank, b.name != nil || b.endet != nil {
                    Text([b.name, b.endet.map { "••\($0)" }].compactMap { $0 }.joined(separator: " "))
                        .font(.dm(.caption))
                        .foregroundStyle(Color.tfLeise)
                        .accessibilityLabel(Texte.Auszahlungen.bankLabel(b.name, b.endet))
                }
                if let f = auszahlung.fehler?.leerAlsNil {
                    Text(f).font(.dm(.subheadline, weight: .medium)).foregroundStyle(Color.tfRot)
                }
            }
            if !gross { Spacer() }
            StatusChip(auszahlung: auszahlung)
        }
        .accessibilityElement(children: .combine)
    }
}
