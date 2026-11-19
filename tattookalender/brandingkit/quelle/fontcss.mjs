import { readFileSync } from "node:fs";
const F = process.env.HOME + "/Downloads/Tattookalender-Brandingkit/Farben-Schriften/Schriften";
const b64 = (p) => readFileSync(p).toString("base64");
export const FONT_CSS = `@font-face{font-family:"Bricolage Grotesque";src:url(data:font/ttf;base64,${b64(F + "/Bricolage-Grotesque/BricolageGrotesque[opsz,wdth,wght].ttf")}) format("truetype");font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:Inter;src:url(data:font/ttf;base64,${b64(F + "/Inter/Inter[opsz,wght].ttf")}) format("truetype");font-weight:100 900}`;
