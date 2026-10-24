import { describe, expect, it } from "vitest";
import {
  getUploadedMediaPath,
  sanitizeFileName,
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
