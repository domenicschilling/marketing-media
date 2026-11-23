import SwiftUI

@main
struct TattoofinApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(AppState.shared)
                .environment(AppState.shared.portal)
                .environment(AppState.shared.sperre)
                .tint(Color.tfAkzent)
                // Kein globaler Schrift-Deckel mehr (DS APPKonzept, 18.11.2026): Alle Größen bis AX5 sind erlaubt,
                // nur der Ziffernblock der Kasse ist einzeln begrenzt (Ziffernblock in KasseView.swift).
        }
    }
}

struct RootView: View {
    @Environment(AppState.self) private var app
    @Environment(SperreManager.self) private var sperre
    @Environment(\.scenePhase) private var phase

    var body: some View {
        ZStack {
            switch app.phase {
            case .start:
                StartBild()
            case .anmeldung:
                AnmeldungFlow()
            case .einrichtung:
                EinrichtungView()
            case .bereit:
                HauptView()
            }

            if sperre.gesperrt && app.phase != .anmeldung {
                SperreView()
                    .transition(.opacity)
                    .zIndex(2)
            } else if phase != .active && app.phase == .bereit {
                // Im App-Umschalter keine Zahlungen zeigen
                StartBild().zIndex(1)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: sperre.gesperrt)
        .task { await app.starten() }
        .onChange(of: phase) { _, neu in
            switch neu {
            case .background: sperre.inDenHintergrund()
            case .active: sperre.wiederAktiv()
            default: break
            }
        }
    }
}

/// Markenblauer Hintergrund mit Figur (Start, App-Umschalter)
struct StartBild: View {
    var body: some View {
        ZStack {
            Color.tfBlau.ignoresSafeArea()
            Image(.figur)
                .resizable()
                .scaledToFit()
                .frame(width: 150)
                .accessibilityHidden(true)
        }
    }
}

/// Die fünf Tabs nach der Anmeldung
struct HauptView: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal

    var body: some View {
        @Bindable var app = app
        TabView(selection: $app.tab) {
            Tab(Texte.Tabs.kasse, systemImage: "eurosign.circle", value: HauptTab.kasse) {
                KasseView()
                    .accessibilityElement(children: .contain)
                    .accessibilityIdentifier("bildschirm.kasse")
            }
            Tab(Texte.Tabs.zahlungen, systemImage: "list.bullet.rectangle", value: HauptTab.zahlungen) {
                ZahlungenView()
                    .accessibilityElement(children: .contain)
                    .accessibilityIdentifier("bildschirm.zahlungen")
            }
            Tab(Texte.Tabs.gutscheine, systemImage: "gift", value: HauptTab.gutscheine) {
                GutscheineView()
                    .accessibilityElement(children: .contain)
                    .accessibilityIdentifier("bildschirm.gutscheine")
            }
            Tab(Texte.Tabs.werbung, systemImage: "megaphone", value: HauptTab.werbung) {
                WerbungView()
                    .accessibilityElement(children: .contain)
                    .accessibilityIdentifier("bildschirm.werbung")
            }
            Tab(Texte.Tabs.konto, systemImage: "person.crop.circle", value: HauptTab.konto) {
                KontoView()
                    .accessibilityElement(children: .contain)
                    .accessibilityIdentifier("bildschirm.konto")
            }
        }
        // Studio-Wechsel (1.2): neues Studio = neue Ansicht (alle Tabs, Pfade und Eingaben beginnen frisch)
        .id(app.sitzung?.studioId)
        .environment(WerbungStore.shared)
        .task(id: app.sitzung?.studioId) {
            await portal.laden()
            // Apple-Studios: Stand des Abos höchstens alle 6 Stunden an den Server
            await AboManager.shared.abgleichWennNoetig(studio: portal.studio)
            // Studios dieser Adresse (Knopf „Studio wechseln“, Mitteilungen aus allen Studios)
            await app.studiosAktualisieren()
        }
        .overlay(alignment: .top) { WechselHinweisBanner() }
    }
}

/// Kurzer Hinweis oben nach einem Studio-Wechsel (verschwindet nach 8 Sekunden oder beim Antippen, VoiceOver liest ihn vor)
struct WechselHinweisBanner: View {
    @Environment(AppState.self) private var app

    var body: some View {
        if let text = app.wechselHinweis {
            Text(text)
                .font(.dm(.subheadline, weight: .semibold))
                .foregroundStyle(Color.tfBlau)   // dunkle Schrift auf Gelb, hell und dunkel gleich (Kontrast > 6:1)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.tfGelbHell, in: RoundedRectangle(cornerRadius: 14))
                .padding(.horizontal, 12)
                .padding(.top, 4)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onTapGesture { app.wechselHinweis = nil }
                .accessibilityIdentifier("wechsel-hinweis")
                .task(id: text) {
                    UIAccessibility.post(notification: .announcement, argument: text)
                    #if DEBUG
                    // Nur UI-Tests: Hinweis bleibt bis zum Antippen (XCTest wartet nach dem Tippen auf Ruhe, das kann > 8 s dauern)
                    if UserDefaults.standard.bool(forKey: "TFHinweisBleibt") { return }
                    #endif
                    try? await Task.sleep(for: .seconds(8))  // ds-ok: abgebrochen = Hinweis schon weg oder neuer Hinweis
                    if app.wechselHinweis == text { withAnimation { app.wechselHinweis = nil } }
                }
        }
    }
}
