// Rendert jede PDF-Seite mit Apple PDFKit (Quartz) als PNG – so wie Vorschau/Safari sie zeigen.
import PDFKit
import AppKit
let args = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: args[1]))!
print("Seiten: \(doc.pageCount)")
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  let r = page.bounds(for: .mediaBox)
  let scale: CGFloat = 2.0
  let img = NSImage(size: NSSize(width: r.width * scale, height: r.height * scale))
  img.lockFocus()
  NSColor.white.set(); NSRect(x: 0, y: 0, width: r.width * scale, height: r.height * scale).fill()
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: ctx)
  img.unlockFocus()
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(args[2])/seite-\(i + 1).png"))
}
