import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { error: e1 } = await supabase.rpc('execute_sql', {
        sql_script: `
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS pos_desktop_layout text DEFAULT 'classic';
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS pos_mobile_layout text DEFAULT 'classic';
    `
    });
    console.log('Result execute_sql rpc:', e1);
}
run();
