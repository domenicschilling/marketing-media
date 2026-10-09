// GET /api/config – öffentliche Preise und Firmendaten für die Website
import { publicConfig } from "./_lib/config.mjs";
import { json } from "./_lib/util.mjs";

export default async () => json(publicConfig(), 200, { "cache-control": "public, max-age=300" });

export const config = { path: "/api/config" };
