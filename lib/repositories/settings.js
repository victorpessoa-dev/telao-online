export async function getAppSetting(supabase, key, churchId) {
  if (!churchId)
    throw new Error("Igreja obrigatória para consultar configurações");
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .eq("church_id", churchId)
    .maybeSingle();

  if (error) throw error;
  return data?.value;
}

export async function upsertAppSetting(supabase, key, value, churchId) {
  if (!churchId)
    throw new Error("Igreja obrigatória para salvar configurações");
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key, value, church_id: churchId },
      { onConflict: "church_id,key" },
    );

  if (error) throw error;
}
