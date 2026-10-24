export async function fetchPublicSponsors(supabase, churchId) {
  const { data, error } = await supabase.rpc("get_public_sponsors", {
    church_id_arg: churchId,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchSponsorSettings(supabase, churchId) {
  const { data, error } = await supabase.rpc("get_sponsor_settings", {
    church_id_arg: churchId,
  });
  if (error) throw error;
  return data || {};
}

export async function fetchPublicSponsorDirectory(supabase, churchId) {
  const { data, error } = await supabase.rpc("get_public_sponsor_directory", {
    church_id_arg: churchId,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchPublicSponsorDetail(supabase, sponsorId, churchId) {
  const { data, error } = await supabase.rpc("get_public_sponsor_detail", {
    sponsor_id_arg: sponsorId,
    church_id_arg: churchId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function fetchPublicSponsorReport(
  supabase,
  sponsorId,
  churchId,
  { page = 1, pageSize = 20 } = {},
) {
  const { data, error } = await supabase.rpc("get_public_sponsor_report", {
    sponsor_id_arg: sponsorId,
    church_id_arg: churchId,
    page_arg: page,
    page_size_arg: pageSize,
  });
  if (error) throw error;
  return data || { logs: [], daily: [], totalItems: 0, page, pageSize };
}

export const SPONSOR_SELECT =
  "id, name, kind, media_url, media_type, image_url, website_url, duration_seconds, active, views, total_seconds, last_displayed_at, created_at, updated_at, church_id";

function assertChurchId(churchId, action) {
  if (!churchId) throw new Error(`Igreja obrigatória para ${action}`);
}

export async function listSponsors(supabase, churchId) {
  assertChurchId(churchId, "listar patrocinadores");

  const { data, error } = await supabase
    .from("sponsors")
    .select(SPONSOR_SELECT)
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function insertSponsor(supabase, payload, churchId) {
  assertChurchId(churchId, "criar patrocinadores");
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("create_admin_sponsor", {
      name_arg: payload.name,
      kind_arg: payload.kind,
      media_url_arg: payload.media_url,
      media_type_arg: payload.media_type,
      website_url_arg: payload.website_url,
      duration_seconds_arg: payload.duration_seconds,
      active_arg: payload.active,
      church_id_arg: churchId,
    })
    .single();

  if (!rpcError) return rpcData;

  const rpcMissing = rpcError.code === "42883" || rpcError.code === "PGRST202";
  if (!rpcMissing) {
    const details = [
      rpcError.message,
      rpcError.details,
      rpcError.hint,
      rpcError.code,
    ]
      .filter(Boolean)
      .join(" | ");
    throw new Error(details || "Erro ao criar patrocínio");
  }

  const { data, error } = await supabase
    .from("sponsors")
    .insert({ ...payload, church_id: churchId })
    .select(SPONSOR_SELECT)
    .single();

  if (error) {
    const details = [error.message, error.details, error.hint, error.code]
      .filter(Boolean)
      .join(" | ");
    throw new Error(details || "Erro ao criar patrocínio");
  }
  return data;
}

export async function updateSponsorById(supabase, id, payload, churchId) {
  assertChurchId(churchId, "atualizar patrocinadores");
  // Verify ownership first
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("church_id")
    .eq("id", id)
    .single();

  if (!sponsor || sponsor.church_id !== churchId) {
    throw new Error("Sponsorship does not belong to this church");
  }

  const { data: rpcData, error: rpcError } = await supabase
    .rpc("update_admin_sponsor", {
      sponsor_id_arg: id,
      name_arg: payload.name,
      kind_arg: payload.kind,
      media_url_arg: payload.media_url,
      media_type_arg: payload.media_type,
      website_url_arg: payload.website_url,
      duration_seconds_arg: payload.duration_seconds,
      active_arg: payload.active,
    })
    .single();

  if (!rpcError) return rpcData;

  const rpcMissing = rpcError.code === "42883" || rpcError.code === "PGRST202";
  if (!rpcMissing) {
    const details = [
      rpcError.message,
      rpcError.details,
      rpcError.hint,
      rpcError.code,
    ]
      .filter(Boolean)
      .join(" | ");
    throw new Error(details || "Erro ao atualizar patrocínio");
  }

  const { data, error } = await supabase
    .from("sponsors")
    .update(payload)
    .eq("id", id)
    .eq("church_id", churchId)
    .select(SPONSOR_SELECT)
    .single();

  if (error) {
    const details = [error.message, error.details, error.hint, error.code]
      .filter(Boolean)
      .join(" | ");
    throw new Error(details || "Erro ao atualizar patrocínio");
  }
  return data;
}

export async function syncSponsorDurationsForChurch(
  supabase,
  churchId,
  { image, video },
) {
  assertChurchId(churchId, "sincronizar durações dos patrocinadores");
  const imageDuration = Math.max(3, Number(image) || 10);
  const videoDuration = Math.max(3, Number(video) || 15);
  const results = await Promise.all([
    supabase
      .from("sponsors")
      .update({ duration_seconds: imageDuration })
      .eq("church_id", churchId)
      .eq("media_type", "image"),
    supabase
      .from("sponsors")
      .update({ duration_seconds: videoDuration })
      .eq("church_id", churchId)
      .eq("media_type", "video"),
  ]);

  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function deleteSponsorById(supabase, id, churchId) {
  assertChurchId(churchId, "excluir patrocinadores");
  // Verify ownership first
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("church_id")
    .eq("id", id)
    .single();

  if (!sponsor || sponsor.church_id !== churchId) {
    throw new Error("Sponsorship does not belong to this church");
  }

  const { error } = await supabase
    .from("sponsors")
    .delete()
    .eq("id", id)
    .eq("church_id", churchId);
  if (error) throw error;
}

export async function deleteAllSponsors(supabase, churchId) {
  assertChurchId(churchId, "excluir patrocinadores");
  const { error } = await supabase
    .from("sponsors")
    .delete()
    .eq("church_id", churchId);
  if (error) throw error;
}
