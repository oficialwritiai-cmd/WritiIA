import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('library').select('*').eq('type', 'idea').order('created_at', { ascending: false }).limit(5);
if (error) console.error(error);
console.log(JSON.stringify(data, null, 2));
