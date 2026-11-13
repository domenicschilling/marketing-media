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
                .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
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

/// Die vier Tabs nach der Anmeldung
struct HauptView: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal

    var body: some View {
        @Bindable var app = app
        TabView(selection: $app.tab) {
            Tab(Texte.Tabs.kasse, systemImage: "eurosign.circle", value: HauptTab.kasse) {
                KasseView()
            }
            Tab(Texte.Tabs.zahlungen, systemImage: "list.bullet.rectangle", value: HauptTab.zahlungen) {
                ZahlungenView()
            }
            Tab(Texte.Tabs.gutscheine, systemImage: "gift", value: HauptTab.gutscheine) {
                GutscheineView()
            }
            Tab(Texte.Tabs.konto, systemImage: "person.crop.circle", value: HauptTab.konto) {
                KontoView()
            }
        }
        .task { await portal.laden() }
    }
}
