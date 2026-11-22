export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

// Public read models can be reused briefly without caching administrative data.
export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};

export const PUBLIC_DETAIL_CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
};

// The guide and the public display must resolve the same current schedule.
// Serving an older playlist while a cache revalidates can make them disagree
// after an operator changes the program, so this read model is intentionally
// never cached by the browser or an intermediary.
export const PUBLIC_TELAO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export const PUBLIC_TELAO_VERSION_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};
