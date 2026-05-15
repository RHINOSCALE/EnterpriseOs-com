const SUPABASE_STATE_TABLE = "app_state";
const SUPABASE_PROFILE_TABLE = "profiles";

function getSupabaseClient() {
  if (!window.SUPABASE?.client) {
    console.warn("Supabase client not available.");
    return null;
  }
  return window.SUPABASE.client;
}

window.SUPABASE_STATE = {
  async load(key, fallback) {
    const client = getSupabaseClient();
    if (!client) return fallback;

    const { data, error } = await client
      .from(SUPABASE_STATE_TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.warn("Supabase state load error:", error);
      return fallback;
    }

    if (data?.value !== undefined && data?.value !== null) {
      return data.value;
    }

    await client.from(SUPABASE_STATE_TABLE).upsert({ key, value: fallback });
    return fallback;
  },

  async save(key, value) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(SUPABASE_STATE_TABLE)
      .upsert({ key, value }, { onConflict: "key" })
      .select()
      .single();

    if (error) {
      console.warn("Supabase state save error:", error);
      return null;
    }

    return data;
  },
};

window.SUPABASE_STORAGE = {
  async upload(path, file) {
    const client = getSupabaseClient();
    if (!client) return { error: "No client" };
    const { data, error } = await client.storage
      .from("documentos")
      .upload(path, file, { upsert: true });
    return { data, error };
  },

  async getSignedUrl(path) {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.storage
      .from("documentos")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  },

  async remove(path) {
    const client = getSupabaseClient();
    if (!client) return;
    await client.storage.from("documentos").remove([path]);
  },
};

window.SUPABASE_AUTH = {
  isReady() {
    return !!getSupabaseClient();
  },

  async getSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn("Supabase auth session error:", error);
      return null;
    }
    return data.session;
  },

  async getUser() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) {
      console.warn("Supabase auth user error:", error);
      return null;
    }
    return data.user;
  },

  onAuthStateChange(callback) {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
    return data?.subscription || null;
  },

  async signIn(email, password) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: "Supabase no está disponible." } };
    return await client.auth.signInWithPassword({ email, password });
  },

  async signUp(email, password) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: "Supabase no está disponible." } };
    return await client.auth.signUp({ email, password });
  },

  async signOut() {
    const client = getSupabaseClient();
    if (!client) return { error: { message: "Supabase no está disponible." } };
    return await client.auth.signOut();
  },

  async deleteAccount() {
    const client = getSupabaseClient();
    if (!client) return { error: { message: "Supabase no está disponible." } };
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: { message: "No hay sesión activa." } };
    await client.from(SUPABASE_PROFILE_TABLE).delete().eq("id", user.id);
    await client.rpc("delete_own_account");
    await client.auth.signOut();
    return { error: null };
  },

  async resetPassword(email) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: "Supabase no está disponible." } };
    return await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
  },

  async loadProfileByEmail(email) {
    const client = getSupabaseClient();
    if (!client) return null;
    const normalized = email.toLowerCase().trim();
    const { data, error } = await client
      .from(SUPABASE_PROFILE_TABLE)
      .select("*")
      .eq("email", normalized)
      .maybeSingle();
    if (error) {
      console.warn("Supabase profile load error:", error);
      return null;
    }
    return data;
  },

  async loadProfileById(id) {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from(SUPABASE_PROFILE_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.warn("Supabase profile load by id error:", error);
      return null;
    }
    return data;
  },

  async loadAllProfiles() {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from(SUPABASE_PROFILE_TABLE)
      .select("*");
    if (error) {
      console.warn("Supabase load all profiles error:", error);
      return [];
    }
    return data || [];
  },

  async upsertProfile(profile) {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from(SUPABASE_PROFILE_TABLE)
      .upsert(profile, { onConflict: "id" })
      .select()
      .single();
    if (error) {
      console.warn("Supabase profile save error:", error);
      return null;
    }
    return data;
  },
};
