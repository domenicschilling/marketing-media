import AVKit
import SwiftUI

/// Werbevideo (Reel 9:16 oder Beitrag 4:5): ansehen, in Fotos speichern, teilen, Text kopieren.
struct WerbevideoKarte: View {
    @Environment(WerbungStore.self) private var werbung

    @State private var feed = false
    @State private var textOffen = false
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var meldung: String?
    @State private var teilen: TeilenInhalt?

    private var basis: URL { APIClient.basisURL() }
    private var datei: WerbeVideoDatei { werbung.video(feed: feed) }
    private var videoURL: URL? { WerbungRegeln.adresse(datei.url, basis: basis) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(WerbungTexte.videoTitel).font(.luckiest(24, relativeTo: .title2)).foregroundStyle(Color.tfTinte)
                .accessibilityAddTraits(.isHeader)
            Text(WerbungTexte.videoText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)

            Picker(WerbungTexte.formatLabel, selection: $feed) {
                Text(WerbungTexte.formatReel).tag(false)
                Text(WerbungTexte.formatFeed).tag(true)
            }
            .pickerStyle(.segmented)

            if let videoURL {
                PosterVideo(video: videoURL, poster: WerbungRegeln.adresse(datei.cover, basis: basis),
                            seitenverhaeltnis: feed ? 4.0 / 5.0 : 9.0 / 16.0, label: WerbungTexte.videoLabel)
                    // Etwas kleiner, damit „In Fotos speichern“ ohne Scrollen sichtbar ist
                    .frame(maxHeight: 290)
                    .frame(maxWidth: .infinity)
            }

            Button {
                speichern()
            } label: {
                if arbeitet { ProgressView().tint(Color.tfBlau) } else { Label(WerbungTexte.videoSpeichern, systemImage: "square.and.arrow.down") }
            }
            .buttonStyle(.haupt)
            .disabled(arbeitet || videoURL == nil)

            // Gleiche Bedienung wie bei den Beiträgen: „Text kopieren“ kopiert sofort, „Text ansehen“ zeigt ihn
            KnopfReihe {
                Button {
                    UIPasteboard.general.string = werbung.videoText
                    kurzZeigen(WerbungTexte.kopiert, in: $meldung)
                } label: { Label(WerbungTexte.textKopieren, systemImage: "doc.on.doc") }
                    .buttonStyle(.zweit)
                Button { teilenVorbereiten() } label: { Label(WerbungTexte.teilen, systemImage: "square.and.arrow.up") }
                    .buttonStyle(.zweit)
                    .disabled(arbeitet || videoURL == nil)
            }
            Button { withAnimation { textOffen.toggle() } } label: {
                Text(textOffen ? WerbungTexte.textAusblenden : WerbungTexte.textAnsehen).font(.dm(.subheadline, weight: .semibold))
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
            }
            .foregroundStyle(Color.tfAkzent)

            if textOffen {
                PostingText(text: werbung.videoText)
            }

            if let fehler { FehlerZeile(text: fehler) }
            RueckmeldungsText(text: meldung)
            // Der aufgeklappte Text enthält die Fußnote schon → nicht doppelt zeigen
            if !textOffen { KlarnaFussnote(text: werbung.fussnote) }
        }
        .karte()
        .sheet(item: $teilen) { TeilenSheet(dinge: $0.dinge).presentationDetents([.medium, .large]) }
        .onChange(of: feed) { fehler = nil }
    }

    private var dateiName: String { "werbevideo-\(feed ? "feed" : "reel").mp4" }

    private func speichern() {
        guard let videoURL else { return }
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            do {
                let lokal = try await TeilenDateien.laden(videoURL, name: dateiName)
                try await FotoSpeicher.video(lokal)
                kurzZeigen(WerbungTexte.gespeichert, in: $meldung)
                await werbung.abhaken("werbung")
            } catch let e as FotoSpeicher.Fehler {
                fehler = FotoSpeicher.text(e)
            } catch {
                fehler = WerbungTexte.ladeFehler
            }
        }
    }

    private func teilenVorbereiten() {
        guard let videoURL else { return }
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            do {
                let lokal = try await TeilenDateien.laden(videoURL, name: dateiName)
                teilen = TeilenInhalt(dinge: [lokal])
            } catch {
                fehler = WerbungTexte.ladeFehler
            }
        }
    }
}

/// Inhalt für das Teilen-Menü (als Sheet-Element)
struct TeilenInhalt: Identifiable {
    let id = UUID()
    let dinge: [Any]
}

/// Posting-Text zum Lesen (auswählbar)
struct PostingText: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.dm(.footnote))
            .foregroundStyle(Color.tfTinte)
            .textSelection(.enabled)
            .fixedSize(horizontal: false, vertical: true)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.tfHintergrund, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
    }
}

/// Video mit Vorschaubild: lädt erst beim Antippen (spart Datenvolumen), dann normaler iOS-Player.
/// Lädt das Video nicht (kein Internet), erscheint ein kurzer Hinweis mit „Nochmal versuchen“.
struct PosterVideo: View {
    let video: URL
    let poster: URL?
    let seitenverhaeltnis: CGFloat
    let label: String

    @State private var player: AVPlayer?
    @State private var status = VideoLadeStatus()

    var body: some View {
        ZStack {
            if let player, !status.fehler {
                VideoPlayer(player: player)
                    .accessibilityLabel(label)
            } else {
                Button { abspielen() } label: {
                    ZStack {
                        Color.tfBlau
                        AsyncImage(url: poster) { bild in
                            bild.resizable().scaledToFill()
                        } placeholder: {
                            Image(.figur).resizable().scaledToFit().frame(width: 90).opacity(0.6)
                        }
                        Image(systemName: status.fehler ? "arrow.clockwise.circle.fill" : "play.circle.fill")
                            .font(.system(size: 64))  // ds-ok: Abspielsymbol auf dem Video (64 pt), Knopf hat Beschriftung
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(Color.tfBlau, Color.tfGelb)
                            .shadow(radius: 6)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(status.fehler ? "\(WerbungTexte.videoFehler) \(WerbungTexte.nochmal)" : "\(label). \(WerbungTexte.abspielen)")
            }
        }
        .aspectRatio(seitenverhaeltnis, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
        .overlay(alignment: .bottom) {
            if status.fehler {
                Text(WerbungTexte.videoFehler)
                    .font(.dm(.footnote, weight: .semibold))
                    .foregroundStyle(Color.tfBlau)
                    .multilineTextAlignment(.center)
                    .padding(8)
                    .frame(maxWidth: .infinity)
                    .background(Color.tfGelbHell.opacity(0.95))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .padding(8)
                    .accessibilityHidden(true)
            }
        }
        .onChange(of: video) {
            player?.pause()
            player = nil
            status.zuruecksetzen()
        }
        .onDisappear { player?.pause() }
    }

    private func abspielen() {
        // Ton auch bei stummgeschaltetem iPhone (wie jedes Video)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)  // ds-ok: Ton-Kategorie optional, Video spielt trotzdem
        let item = AVPlayerItem(url: video)
        status.beobachten(item)
        let p = AVPlayer(playerItem: item)
        player = p
        p.play()
    }
}

/// Beobachtet, ob ein Video laden kann (AVPlayerItem.status == .failed → Hinweis statt schwarzem Bild)
@MainActor
@Observable
final class VideoLadeStatus {
    var fehler = false
    @ObservationIgnored private var beobachter: NSKeyValueObservation?
    @ObservationIgnored private var abbruch: NSObjectProtocol?

    func beobachten(_ item: AVPlayerItem) {
        zuruecksetzen()
        beobachter = item.observe(\.status, options: [.new]) { [weak self] i, _ in
            let kaputt = i.status == .failed
            Task { @MainActor in if kaputt { self?.fehler = true } }
        }
        abbruch = NotificationCenter.default.addObserver(forName: AVPlayerItem.failedToPlayToEndTimeNotification, object: item, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.fehler = true }
        }
    }

    func zuruecksetzen() {
        fehler = false
        beobachter?.invalidate()
        beobachter = nil
        if let abbruch { NotificationCenter.default.removeObserver(abbruch) }
        abbruch = nil
    }
}
