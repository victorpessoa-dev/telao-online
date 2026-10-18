function getLocalOverlays() {
  if (typeof window === "undefined") return null;
  return window.vPlaycastDesktop?.overlays || null;
}

function requireLocalOverlays() {
  const local = getLocalOverlays();
  if (!local) {
    throw new Error("Overlays são disponíveis somente no aplicativo V Playcast para Windows.");
  }
  return local;
}

export async function listOverlays() {
  return requireLocalOverlays().list();
}

export async function insertOverlay(_supabase, payload) {
  return requireLocalOverlays().create(payload);
}

export async function updateOverlayById(_supabase, id, payload) {
  return requireLocalOverlays().update(id, payload);
}

export async function deleteOverlayById(_supabase, id) {
  return requireLocalOverlays().remove(id);
}
