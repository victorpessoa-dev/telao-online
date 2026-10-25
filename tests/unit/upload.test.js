import { describe, expect, it } from "vitest";
import {
  getUploadedMediaPath,
  getMediaOptimizationSummary,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  sanitizeFileName,
  validateFinalMediaFile,
  validateMediaFile,
} from "@/services/supabase/upload";

describe("media upload validation", () => {
  it("sanitizes filenames for storage paths", () => {
    expect(sanitizeFileName("Logo São José 2026.PNG")).toBe(
      "logo-sao-jose-2026.png",
    );
  });

  it("accepts allowed media files", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "image/png",
      }),
    ).not.toThrow();
  });

  it("accepts browser-processable MOV uploads before MP4 conversion", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "video/quicktime",
      }),
    ).not.toThrow();
  });

  it("rejects unsupported media types", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "application/pdf",
      }),
    ).toThrow("Tipo de arquivo não permitido");
  });

  it("rejects files without a media type", () => {
    expect(() =>
      validateMediaFile({
        size: 1024,
        type: "",
      }),
    ).toThrow("Tipo de arquivo não permitido");
  });

  it("enforces the final 1 MB image budget", () => {
    expect(() =>
      validateFinalMediaFile({
        size: MAX_IMAGE_SIZE_BYTES + 1,
        type: "image/webp",
      }),
    ).toThrow("1 MB");
  });

  it("enforces the final 5 MB video budget", () => {
    expect(() =>
      validateFinalMediaFile({
        size: MAX_VIDEO_SIZE_BYTES + 1,
        type: "video/mp4",
      }),
    ).toThrow("5 MB");
  });

  it("reports the actual media reduction from file sizes", () => {
    expect(getMediaOptimizationSummary({ size: 5_000_000 }, { size: 2_000_000 }))
      .toMatchObject({
        originalBytes: 5_000_000,
        finalBytes: 2_000_000,
        reduction: 60,
      });
  });

  it("extracts only files from the application storage bucket", () => {
    expect(
      getUploadedMediaPath(
        "https://project.supabase.co/storage/v1/object/public/telao-online-midia/sponsors/video%20teste.mp4",
      ),
    ).toBe("sponsors/video teste.mp4");
    expect(
      getUploadedMediaPath(
        "https://project.supabase.co/storage/v1/object/public/v-playcast-midia/sponsors/video%20antigo.mp4",
      ),
    ).toBe("sponsors/video antigo.mp4");
    expect(getUploadedMediaPath("https://youtube.com/watch?v=abc")).toBe("");
  });
});
