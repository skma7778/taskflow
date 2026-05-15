import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://nnzosmsppifvayqluepz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uem9zbXNwcGlmdmF5cWx1ZXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjYzOTQsImV4cCI6MjA5NDI0MjM5NH0.E8X2JiE30KXTyAo8q9sREJYg3DZHrpaQARSFjRjpWU8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
