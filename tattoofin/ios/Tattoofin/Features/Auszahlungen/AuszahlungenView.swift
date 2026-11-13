import SwiftUI

/// Bildschirm 10: Saldo und Auszahlungen aufs Bankkonto (native Liste statt eingebettetem Stripe-Baustein)
struct AuszahlungenView: View {
    @State private var antwort: AuszahlungenAntwort?
    @State private var liste: [Auszahlung] = []
    @State private var fehler: String?
    @State private var laedtMehr = false

    var body: some View {
        List {
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
                    Section(Texte.Auszahlungen.listeTitel) {
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

    var body: some View {
        HStack(spacing: 0) {
            spalte(Texte.Auszahlungen.verfuegbar, saldo.verfuegbarCent)
            Rectangle().fill(Color.tfBlau.opacity(0.25)).frame(width: 1).padding(.vertical, 6)
            spalte(Texte.Auszahlungen.unterwegs, saldo.unterwegsCent)
        }
        .padding(.vertical, 16)
        .background(Color.tfGelb, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.tfBlau, lineWidth: 2))
    }

    private func spalte(_ titel: String, _ cent: Int) -> some View {
        VStack(spacing: 4) {
            Text(Euro.text(cent))
                .font(.luckiest(26, relativeTo: .title2))
                .foregroundStyle(Color.tfBlau)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text(titel)
                .font(.dm(.subheadline, weight: .semibold))
                .foregroundStyle(Color.tfBlau)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 8)
        .accessibilityElement(children: .combine)
    }
}

struct AuszahlungZeile: View {
    let auszahlung: Auszahlung

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 3) {
                Text(Euro.text(auszahlung.betragCent))
                    .font(.dm(.body, weight: .bold))
                    .foregroundStyle(Color.tfTinte)
                if let d = Datum.tag(auszahlung.ankunftAm) {
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
            Spacer()
            StatusChip(auszahlung: auszahlung)
        }
        .accessibilityElement(children: .combine)
    }
}
