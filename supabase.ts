
import { createClient } from '@supabase/supabase-js';

// Use environment variables or provided fallbacks to ensure the client always initializes
const supabaseUrl = (process.env as any).SUPABASE_URL || 'https://gkkknbnvobkwiashsrlk.supabase.co';
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY || 'sb_publishable_tZgfI4lfHqzqlXaDdH047A_cjrirvQc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
