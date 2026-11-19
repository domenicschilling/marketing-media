// Prüf-Datei für ds-pruefer.mjs. Nicht kompilieren, nur lesen lassen.
// Jede Zeile mit "erwartet:" muss genau diese Regeln auslösen; Zeilen ohne dürfen keine auslösen.
// Der Marker steht in einem Blockkommentar am Zeilenende, damit er selbst nichts verändert.
import SwiftUI

struct Beispiel: View {
    @AppStorage("countryCode") var land = "DE"
    @AppStorage("apiToken") var token = ""                         /* erwartet: geheimnis-unsicher */
    @ScaledMetric var groesse: CGFloat = 20

    var body: some View {
        VStack(spacing: 0) {
            Text("a").font(.system(size: 17))                      /* erwartet: feste-schrift */
            Text("b").font(Font.system(size: 17, weight: .bold))  /* erwartet: feste-schrift */
            Text("c").font(.system(size: groesse))                 /* erwartet: schrift-variabel */
            Text("d").font(.custom("DM", size: 17, relativeTo: .body))
            Text("e").font(.custom("DM", fixedSize: 17))           /* erwartet: feste-schrift */
            Text("https://x.de").font(.system(size: 12))           /* erwartet: feste-schrift */
            Text("f").padding(16)                                   /* erwartet: zahl-abstand */
            Text("g").padding([.top, .bottom], 12)                  /* erwartet: zahl-abstand */
            Text("h").padding(.horizontal, DSAbstand.l)
            VStack(spacing: 0) { Text("i") }.padding(8)             /* erwartet: zahl-abstand */
            Text("j").cornerRadius(12)                              /* erwartet: zahl-radius */
            Text("k").opacity(0.5)                                  /* erwartet: text-deckkraft */
            Text("l").foregroundStyle(.blue)                        /* erwartet: feste-farbe */
            Rectangle().fill(.red)                                  /* erwartet: feste-farbe */
            Text("m").font(.caption2)                               /* erwartet: caption2 */
            Text("n").minimumScaleFactor(0.5)                       /* erwartet: schrift-verkleinert */
            Text("o").animation(.easeIn, value: 1)                  /* erwartet: roh-animation */
            Text("p").frame(height: 50)                             /* erwartet: zahl-groesse */
            Text("q").onTapGesture { }                              /* erwartet: ontapgesture */
            ForEach(0..<3) { _ in Text("r") }
            ForEach(0..<liste.count) { _ in Text("s") }             /* erwartet: foreach-indizes */
            Text("t").font(.system(size: 64)) // ds-ok: Dekor
            Button(action: {}) {                                    /* erwartet: symbol-ohne-text */
                Image(systemName: "plus")
            }
            Button(action: {}) {
                Image(systemName: "plus")
            }
            .accessibilityLabel("Neu")
            Button("Neu", systemImage: "plus") {}
        }
        .dynamicTypeSize(..<DynamicTypeSize.accessibility1)         /* erwartet: schrift-deckel */
        .toolbarBackground(.visible, for: .tabBar)                  /* erwartet: leisten-hintergrund */
    }

    func laden() {
        let daten = try! Data(contentsOf: url)                      /* erwartet: try-ausrufezeichen */
        let x = try? JSONDecoder().decode(A.self, from: daten)      /* erwartet: try-fragezeichen */
        UserDefaults.standard.set(token, forKey: "t")               /* erwartet: geheimnis-unsicher */
        _ = UIScreen.main.bounds                                    /* erwartet: uiscreen-main */
        /* Text("u").font(.system(size: 99)) im Blockkommentar zählt nicht */
    }
}
