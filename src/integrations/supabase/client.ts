import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase environment variables are missing. API calls will fail until configured.");
}

export const supabase = createClient(
  supabaseUrl ?? "https://example.supabase.co",
  supabaseKey ?? "public-anon-key"
);
