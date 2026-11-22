import fs from 'node:fs';
const v={hell:{a:'#0f766e',b:'#111827',f:'#ffffff'},dunkel:{a:'#2dd4bf',b:'#ffffff',f:'#111827'},gruen:{a:'#ffffff',b:'#ffffff',f:'#0f766e'}};
const m={
 blatt:({a,f})=>`<path fill="${a}" d="M18 5H39L53 19V44a6 6 0 0 1-6 6H30L17 60V50A6 6 0 0 1 11 44V11A6 6 0 0 1 18 5Z"/><path fill="${f}" opacity=".35" d="M39 5V15a4 4 0 0 0 4 4H53Z"/><rect x="20" y="25" width="24" height="4.5" rx="2.25" fill="${f}"/><rect x="20" y="35" width="15" height="4.5" rx="2.25" fill="${f}"/>`,
 zeilen:({a,b})=>`<rect x="4" y="25" width="6" height="14" rx="3" fill="${a}"/><rect x="13.5" y="13" width="6" height="38" rx="3" fill="${a}"/><rect x="23" y="20" width="6" height="24" rx="3" fill="${a}"/><rect x="35" y="13" width="25" height="6" rx="3" fill="${b}"/><rect x="35" y="29" width="25" height="6" rx="3" fill="${b}"/><rect x="35" y="45" width="15" height="6" rx="3" fill="${b}"/>`,
 haken:({a})=>`<rect x="3" y="27" width="6" height="12" rx="3" fill="${a}"/><rect x="12" y="18" width="6" height="30" rx="3" fill="${a}"/><rect x="21" y="24" width="6" height="18" rx="3" fill="${a}"/><path d="M32 35.5 41 45 60.5 17" fill="none" stroke="${a}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>`,
 buchstabe:({a,b})=>`<circle cx="29" cy="35" r="20" fill="none" stroke="${b}" stroke-width="8"/><rect x="45" y="11" width="8" height="44" rx="4" fill="${b}"/><rect x="20.5" y="31" width="4" height="8" rx="2" fill="${a}"/><rect x="27" y="26" width="4" height="18" rx="2" fill="${a}"/><rect x="33.5" y="29.5" width="4" height="11" rx="2" fill="${a}"/>`,
};
for(const n in m)for(const k in v)fs.writeFileSync(`dateien/${n}-${k}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="angebot.new">${m[n](v[k])}</svg>\n`);
