import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
    const { data, error } = await supabase.from('user_roles').select('id, user_id, role, business_id, bill_prefix, created_at, manager_full_access').limit(1);
    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('DATA:', data);
    }
}
test();
