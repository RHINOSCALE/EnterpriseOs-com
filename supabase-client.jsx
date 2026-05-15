// Supabase client helper for INDISA.
// These values connect the app to the Supabase project.
const SUPABASE_URL = "https://hrwrwwsgxpgwscatwxjg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FlvHfMo0CGAaqFBMxPNXTQ_fQLOp-gT";

const SUPABASE_IS_READY = typeof supabase !== "undefined";

function createSupabaseClient() {
  if (!SUPABASE_IS_READY) {
    console.warn("Supabase script not loaded. Remote storage will be disabled.");
    return null;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase URL/API key not configured. Remote state fallback will use localStorage.");
    return null;
  }

  return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

window.SUPABASE = {
  client: createSupabaseClient(),
  ready: SUPABASE_IS_READY,
};
