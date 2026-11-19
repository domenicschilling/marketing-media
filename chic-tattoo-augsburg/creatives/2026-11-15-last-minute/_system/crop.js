// Füllt jeden .ph-Rahmen mit genau dem angegebenen Ausschnitt (Originalpixel, nur Browser-Skalierung, keine KI).
// data-crop="x0,y0,x1,y1" in Pixeln der Quelldatei; data-fit="width" skaliert nur auf Breite (Rest fällt unten über/bleibt schwarz).
(function () {
  const boxes = [...document.querySelectorAll('.ph[data-src]')];
  let pending = boxes.length;
  const done = () => { if (--pending <= 0) document.documentElement.setAttribute('data-ready', '1'); };
  if (!pending) document.documentElement.setAttribute('data-ready', '1');
  boxes.forEach((box) => {
    const img = new Image();
    img.onload = () => {
      const [x0, y0, x1, y1] = box.dataset.crop.split(',').map(Number);
      const w = box.clientWidth, h = box.clientHeight;
      const cw = x1 - x0, ch = y1 - y0;
      const f = box.dataset.fit === 'width' ? w / cw : Math.max(w / cw, h / ch);
      img.style.width = img.naturalWidth * f + 'px';
      img.style.height = img.naturalHeight * f + 'px';
      // zentriert im Ausschnitt, falls Seitenverhältnis leicht abweicht
      const ox = (w - cw * f) / 2, oy = box.dataset.fit === 'width' ? 0 : (h - ch * f) / 2;
      img.style.left = (-x0 * f + ox) + 'px';
      img.style.top = (-y0 * f + oy) + 'px';
      if (box.dataset.filter) img.style.filter = box.dataset.filter;
      box.dataset.scale = f.toFixed(3);
      box.appendChild(img);
      done();
    };
    img.onerror = done;
    img.src = box.dataset.src;
  });
  if (location.search.includes('safe')) {
    document.documentElement.classList.add('show-safe');
    const c = document.querySelector('.c.story');
    if (c) { ['safe-top', 'safe-bot'].forEach((k) => { const d = document.createElement('div'); d.className = k; c.appendChild(d); }); }
  }
})();
