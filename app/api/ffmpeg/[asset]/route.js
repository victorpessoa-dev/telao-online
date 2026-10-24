import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const ASSETS = {
  "ffmpeg.js": {
    path: ["@ffmpeg", "ffmpeg", "dist", "umd", "ffmpeg.js"],
    type: "application/javascript; charset=utf-8",
  },
  "814.ffmpeg.js": {
    path: ["@ffmpeg", "ffmpeg", "dist", "umd", "814.ffmpeg.js"],
    type: "application/javascript; charset=utf-8",
  },
  "ffmpeg-core.js": {
    path: ["@ffmpeg", "core", "dist", "umd", "ffmpeg-core.js"],
    type: "application/javascript; charset=utf-8",
  },
  "ffmpeg-core.wasm": {
    path: ["@ffmpeg", "core", "dist", "umd", "ffmpeg-core.wasm"],
    type: "application/wasm",
  },
};

export async function GET(_request, context) {
  const { asset } = await context.params;
  const file = ASSETS[asset];
  if (!file) return new Response("Not found", { status: 404 });

  try {
    const body = await readFile(join(process.cwd(), "node_modules", ...file.path));
    return new Response(body, {
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("FFmpeg runtime unavailable", { status: 503 });
  }
}
