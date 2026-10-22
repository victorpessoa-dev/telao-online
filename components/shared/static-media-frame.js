"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function isGifSource(src = "") {
  const value = src.toLowerCase();
  return value.startsWith("data:image/gif") || /\.gif($|[?#])/i.test(value);
}

function shouldFreeze(type, src) {
  return type === "video" || isGifSource(src);
}

export default function StaticMediaFrame({
  src,
  alt = "",
  type = "image",
  className = "",
  style,
  draggable = false,
  onError,
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const [captured, setCaptured] = useState(false);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const freezePreview = shouldFreeze(type, src);

  useEffect(() => {
    setCaptured(false);
    setCaptureFailed(false);
  }, [src, type]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const updateSize = () => {
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);
      setFrameSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const drawSourceToCanvas = useCallback(
    (source) => {
      const canvas = canvasRef.current;
      const { width, height } = frameSize;
      if (!canvas || !width || !height) return false;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));

      const context = canvas.getContext("2d");
      if (!context) return false;

      try {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        const sourceWidth =
          source.videoWidth || source.naturalWidth || source.width;
        const sourceHeight =
          source.videoHeight || source.naturalHeight || source.height;
        if (!sourceWidth || !sourceHeight) return false;
        const scale = Math.max(width / sourceWidth, height / sourceHeight);
        const drawWidth = sourceWidth * scale;
        const drawHeight = sourceHeight * scale;

        context.drawImage(
          source,
          (width - drawWidth) / 2,
          (height - drawHeight) / 2,
          drawWidth,
          drawHeight,
        );
        setCaptured(true);
        return true;
      } catch {
        setCaptureFailed(true);
        return false;
      }
    },
    [frameSize],
  );

  useEffect(() => {
    if (
      !freezePreview ||
      captureFailed ||
      !frameSize.width ||
      !frameSize.height
    )
      return;

    if (type === "video" && videoRef.current?.readyState >= 2) {
      drawSourceToCanvas(videoRef.current);
    }

    if (type === "image" && imageRef.current?.complete) {
      drawSourceToCanvas(imageRef.current);
    }
  }, [
    captureFailed,
    drawSourceToCanvas,
    frameSize.height,
    frameSize.width,
    freezePreview,
    type,
  ]);

  if (!src) return null;

  if (!freezePreview || captureFailed) {
    if (type === "video") {
      return (
        <video
          src={src}
          className={className}
          style={style}
          muted
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          tabIndex={-1}
          preload="metadata"
          referrerPolicy="no-referrer"
          onError={onError}
        />
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        draggable={draggable}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onError}
      />
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className={`${className} ${captured ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />

      {type === "video" ? (
        <video
          ref={videoRef}
          src={src}
          crossOrigin="anonymous"
          className={`absolute inset-0 ${className} ${captured ? "pointer-events-none opacity-0" : "opacity-100"}`}
          muted
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          tabIndex={-1}
          preload="auto"
          referrerPolicy="no-referrer"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.currentTime = Number.isFinite(video.duration)
              ? Math.min(1, Math.max(0, video.duration / 2))
              : 0;
          }}
          onSeeked={(event) => {
            event.currentTarget.pause();
            drawSourceToCanvas(event.currentTarget);
          }}
          onError={(event) => {
            setCaptureFailed(true);
            onError?.(event);
          }}
        />
      ) : (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          draggable={draggable}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 ${className} ${captured ? "pointer-events-none opacity-0" : "opacity-100"}`}
          onLoad={(event) => {
            drawSourceToCanvas(event.currentTarget);
          }}
          onError={(event) => {
            setCaptureFailed(true);
            onError?.(event);
          }}
        />
      )}
    </div>
  );
}
