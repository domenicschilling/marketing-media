import SwiftUI

@main
struct TattoofinApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        // Navigationstitel, Segmente und Tab-Leiste in DM Sans und Markenfarben (sonst SF Pro Schwarz)
        TFLeistenStil.einrichten()
    }

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
            case .active:
                sperre.wiederAktiv()
                PushManager.shared.imVordergrund()
                // Zurück nach längerer Zeit: Zahlungen, Kennzahlen und Kassen-Stand (Abo, Stripe, Adresse) auffrischen
                if app.phase == .bereit, !app.portal.laedt, PortalStore.neuLadenNoetig(geladenAm: app.portal.geladenAm) {
                    Task { await app.portal.laden() }
                }
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
        .environment(WerbungStore.shared)
        .task {
            await portal.laden()
            // Apple-Studios: Stand des Abos höchstens alle 6 Stunden an den Server
            await AboManager.shared.abgleichWennNoetig(studio: portal.studio)
        }
    }
}
