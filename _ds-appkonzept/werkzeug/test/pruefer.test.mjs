#!/usr/bin/env node
// Selbsttest des DS-Prüfers: node content/_ds-appkonzept/werkzeug/test/pruefer.test.mjs
// Liest beispiel.swift, vergleicht die Treffer je Zeile mit den Markern "erwartet: …".
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeText } from '../ds-pruefer.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const text = readFileSync(join(hier, 'beispiel.swift'), 'utf8');
const zeilen = text.split('\n');
const { treffer, ausnahmen } = pruefeText(text);

const ist = new Map();
for (const t of treffer) ist.set(t.zeile, [...(ist.get(t.zeile) ?? []), t.regel].sort());

let fehler = 0;
zeilen.forEach((zeile, i) => {
  const m = zeile.match(/erwartet:\s*([a-z0-9,\- ]+)\s*\*\//);
  const soll = m ? m[1].split(',').map((s) => s.trim()).filter(Boolean).sort() : [];
  const hat = ist.get(i + 1) ?? [];
  if (JSON.stringify(soll) !== JSON.stringify(hat)) {
    fehler += 1;
    console.log(`Zeile ${i + 1}: erwartet [${soll}] bekommen [${hat}]  ${zeile.trim().slice(0, 70)}`);
  }
});
if (ausnahmen !== 1) { fehler += 1; console.log(`ds-ok-Ausnahmen: erwartet 1, bekommen ${ausnahmen}`); }

console.log(fehler === 0 ? `ok: ${treffer.length} Treffer wie erwartet` : `${fehler} Abweichungen`);
process.exit(fehler === 0 ? 0 : 1);
