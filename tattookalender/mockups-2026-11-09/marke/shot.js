// Baut .shot-Ausschnitte: Größe = Ausschnitt × Maßstab, Bild verschoben. Keine Bearbeitung der App-Inhalte.
for (const el of document.querySelectorAll('.shot')) {
  const d = el.dataset, s = +d.s || 1, x = +d.x || 0, y = +d.y || 0;
  el.style.width = (+d.w * s) + 'px'; el.style.height = (+d.h * s) + 'px';
  const img = new Image(); img.src = d.src; img.alt = d.alt || '';
  img.style.width = (+d.cw * s) + 'px'; img.style.left = (-x * s) + 'px'; img.style.top = (-y * s) + 'px';
  el.prepend(img);
}
