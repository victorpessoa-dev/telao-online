import { describe, expect, it } from "vitest";
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from "@/lib/utils/video-source";

describe("video source helpers", () => {
  it("recognizes common public YouTube URL formats", () => {
    expect(
      getYouTubeVideoId("https://www.youtube.com/watch?v=abc123_X-yZ"),
    ).toBe("abc123_X-yZ");
    expect(getYouTubeVideoId("https://youtu.be/abc123_X-yZ?t=10")).toBe(
      "abc123_X-yZ",
    );
    expect(getYouTubeVideoId("https://youtube.com/shorts/abc123_X-yZ")).toBe(
      "abc123_X-yZ",
    );
  });

  it("creates thumbnail and embed URLs only for YouTube links", () => {
    expect(getYouTubeThumbnail("https://youtu.be/video123")).toBe(
      "https://i.ytimg.com/vi/video123/hqdefault.jpg",
    );
    expect(getYouTubeEmbedUrl("https://youtu.be/video123")).toContain(
      "https://www.youtube.com/embed/video123?",
    );
    expect(getYouTubeEmbedUrl("https://example.com/video.mp4")).toBe("");
  });
});
