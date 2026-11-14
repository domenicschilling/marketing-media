import AVKit
import Observation
import SwiftUI

/// „So geht's“: Erklärvideo mit Kapiteln. Das Kapitel „App auf den Startbildschirm“ (Web-App) fehlt und wird beim Abspielen übersprungen.
struct SoGehtsView: View {
    @Environment(WerbungStore.self) private var werbung
    @State private var spieler = SoGehtsSpieler()

    private var basis: URL { APIClient.basisURL() }
    private var info: SoGehtsInfo? { werbung.werbung?.soGehts }
    private var kapitel: [VideoKapitel] {
        // Vom Server (schon ohne Web-App-Kapitel), zur Sicherheit noch einmal gefiltert
        let k = (info?.kapitel?.isEmpty == false ? info!.kapitel! : WerbungRegeln.SoGehts.kapitel)
        return k.filter { $0.name != WerbungRegeln.SoGehts.ohneName }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(WerbungTexte.soGehtsText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)

                Group {
                    if let p = spieler.player {
                        VideoPlayer(player: p).accessibilityLabel(WerbungTexte.soGehtsLabel)
                    } else {
                        Button { starten(ab: 0) } label: {
                            ZStack {
                                Color.tfBlau
                                AsyncImage(url: WerbungRegeln.adresse(info?.poster ?? WerbungRegeln.SoGehts.poster, basis: basis)) { b in
                                    b.resizable().scaledToFill()
                                } placeholder: {
                                    Image(.figur).resizable().scaledToFit().frame(width: 90).opacity(0.6)
                                }
                                Image(systemName: "play.circle.fill")
                                    .font(.system(size: 64))
                                    .symbolRenderingMode(.palette)
                                    .foregroundStyle(Color.tfBlau, Color.tfGelb)
                                    .shadow(radius: 6)
                            }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(WerbungTexte.soGehtsLabel). \(WerbungTexte.abspielen)")
                    }
                }
                .aspectRatio(9.0 / 16.0, contentMode: .fit)
                .frame(maxHeight: 520)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 0) {
                    Text("\(WerbungTexte.kapitel) (\(kapitel.count))")
                        .font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                        .padding(.bottom, 6)
                        .accessibilityAddTraits(.isHeader)
                    ForEach(Array(kapitel.enumerated()), id: \.element.id) { i, k in
                        let an = spieler.laeuft && aktuell == i
                        Button { starten(ab: k.ab) } label: {
                            HStack(spacing: 12) {
                                Text(Self.zeit(k.ab))
                                    .font(.dm(.subheadline, weight: .semibold).monospacedDigit())
                                    .foregroundStyle(an ? Color.tfBlau : Color.tfLeise)
                                    .frame(minWidth: 40, alignment: .leading)
                                Text(k.name)
                                    .font(.dm(.body, weight: an ? .bold : .regular))
                                    .foregroundStyle(an ? Color.tfBlau : Color.tfTinte)
                                    .fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 0)
                                if an { Image(systemName: "speaker.wave.2.fill").foregroundStyle(Color.tfBlau).accessibilityHidden(true) }
                            }
                            .padding(.vertical, 10)
                            .padding(.horizontal, 10)
                            .background(an ? Color.tfGelbHell : Color.clear, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(k.name), ab \(Self.gesprochen(k.ab))")
                        .accessibilityAddTraits(an ? .isSelected : [])
                    }
                }
                .karte()

                VStack(alignment: .leading, spacing: 6) {
                    Text(info?.hinweis ?? WerbungTexte.soGehtsFuss).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                    KlarnaFussnote(text: info?.fussnote ?? WerbungTexte.fussnote)
                }
            }
            .padding(16)
        }
        .tfHintergrund()
        .navigationTitle(WerbungTexte.soGehtsTitel)
        .navigationBarTitleDisplayMode(.inline)
        .task { await werbung.laden() }
        .onDisappear { spieler.anhalten() }
    }

    private var aktuell: Int {
        var a = 0
        for (i, k) in kapitel.enumerated() where spieler.zeit >= k.ab - 0.2 { a = i }
        return a
    }

    private func starten(ab: Double) {
        guard let u = WerbungRegeln.adresse(info?.url ?? WerbungRegeln.SoGehts.video, basis: basis) else { return }
        spieler.abspielen(u, ab: ab)
    }

    static func zeit(_ s: Double) -> String {
        let t = Int(s.rounded())
        return "\(t / 60):" + String(format: "%02d", t % 60)
    }

    static func gesprochen(_ s: Double) -> String {
        let t = Int(s.rounded())
        let m = t / 60, sek = t % 60
        if m == 0 { return "\(sek) Sekunden" }
        return sek == 0 ? "\(m) Minuten" : "\(m) Minuten \(sek)"
    }
}

/// Player mit Zeitbeobachtung: aktuelles Kapitel hervorheben, Web-App-Teil überspringen
@MainActor
@Observable
final class SoGehtsSpieler {
    var player: AVPlayer?
    var zeit: Double = 0
    var laeuft = false
    @ObservationIgnored private var beobachter: Any?

    func abspielen(_ url: URL, ab: Double) {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        if player == nil {
            let p = AVPlayer(url: url)
            player = p
            beobachter = p.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] t in
                MainActor.assumeIsolated { self?.tick(t.seconds) }
            }
        }
        let ziel = WerbungRegeln.SoGehts.ueberspringen.contains(ab) ? WerbungRegeln.SoGehts.ueberspringen.upperBound : ab
        player?.seek(to: CMTime(seconds: ziel, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        player?.play()
        laeuft = true
        zeit = ziel
    }

    private func tick(_ s: Double) {
        guard s.isFinite else { return }
        zeit = s
        // Teil „App auf den Startbildschirm“ (nur Web-App) überspringen
        let b = WerbungRegeln.SoGehts.ueberspringen
        if s >= b.lowerBound && s < b.upperBound - 0.3 {
            player?.seek(to: CMTime(seconds: b.upperBound, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        }
    }

    func anhalten() {
        player?.pause()
    }
}

/// Zeile „So geht's“ im Konto (auch wenn die Karte in der Kasse ausgeblendet ist)
struct SoGehtsAbschnitt: View {
    var body: some View {
        Section {
            NavigationLink { SoGehtsView() } label: {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(WerbungTexte.soGehtsTitel).foregroundStyle(Color.tfTinte)
                        Text(WerbungTexte.soGehtsKurz).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    }
                } icon: {
                    Image(systemName: "play.rectangle").foregroundStyle(Color.tfAkzent)
                }
            }
        }
    }
}
