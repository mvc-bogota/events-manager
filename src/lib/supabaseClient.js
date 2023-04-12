import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/public';


export const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
