export function getYouTubeVideoId(source = "") {
  try {
    const url = new URL(String(source).trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be")
      return url.pathname.split("/").filter(Boolean)[0] || "";
    if (!["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host))
      return "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";

    const parts = url.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
  } catch {
    return "";
  }

  return "";
}

export function getYouTubeThumbnail(source) {
  const videoId = getYouTubeVideoId(source);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
}

export function getYouTubeEmbedUrl(
  source,
  { autoplay = true, controls = false } = {},
) {
  const videoId = getYouTubeVideoId(source);
  if (!videoId) return "";

  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    controls: controls ? "1" : "0",
    disablekb: "1",
    enablejsapi: "1",
    fs: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    mute: "1",
    playsinline: "1",
    rel: "0",
  });

  if (typeof window !== "undefined")
    params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}

function loadImage(source, timeoutMs) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.src = "";
      reject(new Error("O YouTube demorou demais para responder"));
    }, timeoutMs);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Não foi possível carregar o vídeo do YouTube"));
    };
    image.src = source;
  });
}

function loadDirectVideo(source, timeoutMs) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("O vídeo demorou demais para carregar"));
    }, timeoutMs);

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("O link não aponta para um vídeo público compatível"));
    };
    video.src = source;
    video.load();
  });
}

export async function validatePublicVideoSource(
  source,
  { timeoutMs = 10000 } = {},
) {
  const value = String(source || "").trim();
  if (!value) throw new Error("Informe o link do vídeo");

  const thumbnail = getYouTubeThumbnail(value);
  if (thumbnail) {
    await loadImage(thumbnail, timeoutMs);
    return { type: "youtube", source: value, thumbnail };
  }

  await loadDirectVideo(value, timeoutMs);
  return { type: "direct", source: value, thumbnail: "" };
}
