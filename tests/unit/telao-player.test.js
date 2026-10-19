import { describe, expect, it } from "vitest";
import {
  buildAdsSignature,
  getMediaDuration,
  getDesignValue,
  shuffleArray,
} from "@/lib/services/telao-player";

describe("telao player helpers", () => {
  it("reads modern and legacy design dimensions", () => {
    expect(
      getDesignValue(
        { contentWidth: 60, imageWidth: 40 },
        "contentWidth",
        "imageWidth",
        100,
      ),
    ).toBe(60);
    expect(
      getDesignValue({ imageWidth: 40 }, "contentWidth", "imageWidth", 100),
    ).toBe(40);
    expect(getDesignValue({}, "contentWidth", "imageWidth", 100)).toBe(100);
  });

  it("builds a stable signature from ad fields that affect display", () => {
    const signature = buildAdsSignature([
      {
        id: "a",
        updatedAt: "1",
        duration: 10,
        active: true,
        src: "a.webp",
        type: "NORMAL",
        mediaType: "image",
        ignored: "x",
      },
    ]);

    expect(signature).toBe(
      JSON.stringify({
        ads: [
          {
            id: "a",
            updatedAt: "1",
            duration: 10,
            active: true,
            src: "a.webp",
            type: "NORMAL",
            mediaType: "image",
          },
        ],
        settings: null,
      }),
    );
  });

  it("shuffles without mutating the source array", () => {
    const source = ["a", "b", "c"];
    const shuffled = shuffleArray(source, () => 0);

    expect(source).toEqual(["a", "b", "c"]);
    expect(shuffled).toEqual(["c", "a", "b"]);
  });

  it("prioritizes each sponsor duration and uses settings as fallback", () => {
    expect(getMediaDuration({ mediaType: "image", duration: 4 }, { image: 12 })).toBe(4);
    expect(getMediaDuration({ mediaType: "video", duration: 4 }, { video: 24 })).toBe(4);
    expect(getMediaDuration({ mediaType: "video" }, { video: 24 })).toBe(24);
  });
});
