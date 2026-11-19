const sharp = (await import("node:module")).createRequire("/Users/domi/mm-tk-app/apps/tf-studio/package.json")("sharp");
const [dir, out, ...files] = process.argv.slice(2);
const w = 440, h = Math.round(w * 2868 / 1320);
const bufs = await Promise.all(files.map((f) => sharp(dir + "/" + f).resize(w, h).toBuffer()));
await sharp({ create: { width: w * files.length + 20 * (files.length - 1), height: h, channels: 3, background: "#888" } })
  .composite(bufs.map((b, i) => ({ input: b, left: i * (w + 20), top: 0 }))).png().toFile(out);
