import { createClient } from "@supabase/supabase-js";

// The publishable key is intentionally safe for browser use. RLS remains the
// authorization boundary for every table. Environment variables can override
// these production defaults for preview and local development.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://glgpksdzregenrhfjasd.supabase.co";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Puv84iHF9e1WeVO9gupkNg_-7bm4VW7";

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
