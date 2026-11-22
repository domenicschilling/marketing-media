import SwiftUI

/// Alle Maße einer DS-App kommen aus dieser Datei (Werte-Tabelle in referenzen/05-gestaltung.md).
/// Keine Zahlen direkt in Ansichten schreiben: `.padding(DSAbstand.m)` statt `.padding(12)`.
public enum DSAbstand {
    /// 4 pt: zwischen Symbol und Text in einer Zeile
    public static let xs: CGFloat = 4
    /// 8 pt: zwischen eng zusammengehörigen Elementen
    public static let s: CGFloat = 8
    /// 12 pt: Innenabstand kleiner Elemente
    public static let m: CGFloat = 12
    /// 16 pt: Standard-Seitenrand und Abstand zwischen Gruppen
    public static let l: CGFloat = 16
    /// 24 pt: zwischen Abschnitten
    public static let xl: CGFloat = 24
    /// 32 pt: vor dem Hauptknopf, Luft am Bildschirmende
    public static let xxl: CGFloat = 32
}

public enum DSRadius {
    /// Kleine Flächen (Marken, Chips)
    public static let klein: CGFloat = 8
    /// Gruppen, Eingabefelder, eigene Flächen
    public static let mittel: CGFloat = 12
    /// Große Flächen, Sheets mit eigenem Hintergrund
    public static let gross: CGFloat = 20
}

public enum DSMass {
    /// Mindestgröße jeder tippbaren Fläche (Apple HIG: 44 × 44 pt).
    public static let tippflaeche: CGFloat = 44
    /// Größte Lesebreite für Text auf dem iPad bzw. im Querformat.
    public static let lesebreite: CGFloat = 640
}

public extension Shape where Self == RoundedRectangle {
    /// Abgerundete Fläche mit Apples kontinuierlicher Kurve (wie System-Elemente).
    static func ds(_ radius: CGFloat = DSRadius.mittel) -> RoundedRectangle {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
    }
}

public extension View {
    /// Macht kleine Symbole auf 44 × 44 pt tippbar, ohne sie größer zu zeichnen.
    func dsTippflaeche() -> some View {
        frame(minWidth: DSMass.tippflaeche, minHeight: DSMass.tippflaeche)
            .contentShape(Rectangle())
    }
}
