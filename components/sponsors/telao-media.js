"use client";

import { useEffect, useRef, useState } from "react";
import { getDesignValue } from "@/lib/services/telao-player";
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
} from "@/lib/utils/video-source";

const DEFAULT_MEDIA_BACKGROUND = "#050505";

export function YouTubeVideo({
  source,
  style,
  onEnded,
  className = "",
  title = "Vídeo do patrocinador",
  endOffset = 1.5,
  repeatUntilLimit = false,
  cropPercent = 8,
}) {
  const frameRef = useRef(null);
  const playbackPollRef = useRef(null);
  const durationRef = useRef(0);
  const endingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(source);
  const thumbnail = getYouTubeThumbnail(source);

  useEffect(() => {
    setIsPlaying(false);
    durationRef.current = 0;
    endingRef.current = false;
    return () => {
      if (playbackPollRef.current)
        window.clearInterval(playbackPollRef.current);
    };
  }, [source]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (
        !String(event.origin).endsWith("youtube.com") ||
        event.source !== frameRef.current?.contentWindow
      )
        return;

      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload?.event === "onStateChange" && payload.info === 1) {
          setIsPlaying(true);
        }
        if (payload?.event === "onStateChange" && payload.info === 0) {
          if (repeatUntilLimit) {
            frameRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                event: "command",
                func: "seekTo",
                args: [0, true],
              }),
              "https://www.youtube.com",
            );
            frameRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "https://www.youtube.com",
            );
            endingRef.current = false;
          } else {
            onEnded?.();
          }
        }
        if (payload?.event === "infoDelivery") {
          const duration = Number(payload.info?.duration);
          const currentTime = Number(payload.info?.currentTime);
          if (Number.isFinite(duration) && duration > 0)
            durationRef.current = duration;

          if (
            !endingRef.current &&
            durationRef.current > 3 &&
            Number.isFinite(currentTime) &&
            durationRef.current - currentTime <= endOffset
          ) {
            endingRef.current = true;
            const player = frameRef.current?.contentWindow;
            if (repeatUntilLimit) {
              player?.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "seekTo",
                  args: [0, true],
                }),
                "https://www.youtube.com",
              );
              player?.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "playVideo",
                  args: [],
                }),
                "https://www.youtube.com",
              );
              window.setTimeout(() => {
                endingRef.current = false;
              }, 500);
            } else {
              player?.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "pauseVideo",
                  args: [],
                }),
                "https://www.youtube.com",
              );
              onEnded?.();
            }
          }
        }
      } catch {
        // Ignora mensagens que não pertencem à API do player.
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [endOffset, onEnded, repeatUntilLimit]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${isPlaying ? "opacity-0" : "opacity-100"}`}
        />
      ) : null}
      <iframe
        ref={frameRef}
        src={embedUrl}
        title={title}
        className={`pointer-events-none absolute border-0 transition-opacity duration-150 ${isPlaying ? "opacity-100" : "opacity-0"}`}
        style={{
          left: `-${cropPercent}%`,
          top: `-${cropPercent}%`,
          width: `${100 + cropPercent * 2}%`,
          height: `${100 + cropPercent * 2}%`,
        }}
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={(event) => {
          event.currentTarget.contentWindow?.postMessage(
            JSON.stringify({ event: "listening" }),
            "https://www.youtube.com",
          );
          setIsPlaying(true);
          if (playbackPollRef.current)
            window.clearInterval(playbackPollRef.current);
          playbackPollRef.current = window.setInterval(() => {
            const player = frameRef.current?.contentWindow;
            player?.postMessage(
              JSON.stringify({
                event: "command",
                func: "getDuration",
                args: [],
              }),
              "https://www.youtube.com",
            );
            player?.postMessage(
              JSON.stringify({
                event: "command",
                func: "getCurrentTime",
                args: [],
              }),
              "https://www.youtube.com",
            );
          }, 500);
        }}
      />
    </div>
  );
}

function clampColor(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { saturation: 0, lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  return { saturation, lightness };
}

function getDominantColorFromCanvas(source) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return DEFAULT_MEDIA_BACKGROUND;

  canvas.width = 48;
  canvas.height = 48;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Map();

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 24) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const { saturation, lightness } = rgbToHsl(red, green, blue);

    if (lightness < 0.04 || lightness > 0.96) continue;

    const bucketRed = Math.round(red / 24) * 24;
    const bucketGreen = Math.round(green / 24) * 24;
    const bucketBlue = Math.round(blue / 24) * 24;
    const key = `${bucketRed},${bucketGreen},${bucketBlue}`;
    const weight = 1 + saturation * 3 + (1 - Math.abs(lightness - 0.5) * 2);
    const bucket = buckets.get(key) || {
      red: 0,
      green: 0,
      blue: 0,
      score: 0,
      count: 0,
    };

    bucket.red += red * weight;
    bucket.green += green * weight;
    bucket.blue += blue * weight;
    bucket.score += weight;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  if (buckets.size === 0) {
    return DEFAULT_MEDIA_BACKGROUND;
  }

  const dominant = [...buckets.values()].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    return Math.abs(scoreDiff) > 0.001 ? scoreDiff : b.count - a.count;
  })[0];

  return `rgb(${clampColor(dominant.red / dominant.score)}, ${clampColor(dominant.green / dominant.score)}, ${clampColor(dominant.blue / dominant.score)})`;
}

export function useMediaBackgroundColor(src, mediaType) {
  const [color, setColor] = useState(DEFAULT_MEDIA_BACKGROUND);

  useEffect(() => {
    if (!src) {
      setColor(DEFAULT_MEDIA_BACKGROUND);
      return undefined;
    }

    let cancelled = false;

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = src;

      const capture = () => {
        if (cancelled || video.videoWidth === 0 || video.videoHeight === 0)
          return;
        try {
          setColor(getDominantColorFromCanvas(video));
        } catch {
          setColor(DEFAULT_MEDIA_BACKGROUND);
        }
      };

      video.addEventListener("loadeddata", capture, { once: true });
      video.load();

      return () => {
        cancelled = true;
        video.removeEventListener("loadeddata", capture);
        video.removeAttribute("src");
        video.load();
      };
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      try {
        setColor(getDominantColorFromCanvas(image));
      } catch {
        setColor(DEFAULT_MEDIA_BACKGROUND);
      }
    };
    image.onerror = () => {
      if (!cancelled) setColor(DEFAULT_MEDIA_BACKGROUND);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [mediaType, src]);

  return color;
}

export default function TelaoMedia({
  ad,
  design,
  onVideoEnded,
  videoDurationLimit,
}) {
  const backgroundColor = useMediaBackgroundColor(ad?.src, ad?.mediaType);
  const layoutEnabled = Boolean(design?.enabled);
  const width = getDesignValue(design, "contentWidth", "imageWidth", 100);
  const height = getDesignValue(design, "contentHeight", "imageHeight", 100);
  const x = getDesignValue(design, "x", null, 50);
  const y = getDesignValue(design, "y", null, 50);
  const youtubeEmbedUrl =
    ad.mediaType === "video" ? getYouTubeEmbedUrl(ad.src) : "";

  const frameStyle = layoutEnabled
    ? {
        width: `${width}%`,
        height: `${height}%`,
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        backgroundColor,
        backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${backgroundColor} 82%, white 18%), ${backgroundColor})`,
      }
    : {
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor,
        backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${backgroundColor} 82%, white 18%), ${backgroundColor})`,
      };

  const mediaStyle = {
    width: "100%",
    height: "100%",
    // The media frame is the available display area in both modes: the whole
    // telão without a background, or the configured frame over a background.
    // Always cover it so no unused bands remain around images or videos.
    objectFit: "cover",
    objectPosition: "center",
  };

  return (
    <div className="overflow-hidden" style={frameStyle}>
      {ad.mediaType === "video" ? (
        youtubeEmbedUrl ? (
          <YouTubeVideo source={ad.src} style={mediaStyle} repeatUntilLimit />
        ) : (
          <video
            key={ad.id}
            src={ad.src}
            className="pointer-events-none relative block"
            style={mediaStyle}
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            tabIndex={-1}
            onTimeUpdate={(event) => {
              const limit = Number(videoDurationLimit);
              if (
                Number.isFinite(limit) &&
                limit > 0 &&
                event.currentTarget.currentTime >= limit
              ) {
                event.currentTarget.pause();
                onVideoEnded?.();
              }
            }}
          />
        )
      ) : (
        <img
          src={ad.src}
          alt={ad.name}
          className="relative block"
          style={mediaStyle}
          draggable={false}
        />
      )}
    </div>
  );
}
