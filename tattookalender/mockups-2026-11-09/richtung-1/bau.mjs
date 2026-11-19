// Baut die PNGs dieser Richtung: node bau.mjs
import { execFileSync } from "child_process";
const dir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
execFileSync("node", [dir + "/../marke/render.mjs", dir, "hero-desktop.html=hero-desktop.png", "hero-handy.html=hero-handy.png", "anzeige-feed.html=anzeige-1080x1350.png", "anzeige-story.html=anzeige-1080x1920.png"], { stdio: "inherit" });
