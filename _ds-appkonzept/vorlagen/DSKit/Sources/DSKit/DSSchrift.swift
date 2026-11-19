import SwiftUI

/// Schrift einer DS-App: immer Apples Textstile, damit Dynamic Type bis AX5 funktioniert.
/// Feste Punktgrößen (`.system(size: 17)`) sind verboten; eine Markenschrift nur für
/// Überschriften und nur über `.custom(_:size:relativeTo:)`.
public extension Font {
    /// Großer Bildschirmtitel (Navigationstitel macht das System selbst).
    static let dsTitel = Font.title2.weight(.semibold)
    /// Überschrift eines Abschnitts.
    static let dsAbschnitt = Font.headline
    /// Normaler Text.
    static let dsText = Font.body
    /// Zweite Zeile, Erklärungen.
    static let dsKlein = Font.subheadline
    /// Zeitstempel, Hinweise unter Feldern.
    static let dsHinweis = Font.footnote
    /// Zahlen, die sich ändern (Beträge, Uhrzeiten): gleiche Ziffernbreite, damit nichts springt.
    static let dsZahl = Font.body.monospacedDigit()
    /// Große Kennzahl oben auf einem Bildschirm.
    static let dsKennzahl = Font.largeTitle.weight(.bold).monospacedDigit()
}
