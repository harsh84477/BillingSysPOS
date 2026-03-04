import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { error: e1 } = await supabase.rpc('execute_sql', {
        sql_script: `
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_title_align text DEFAULT 'center';
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_contact_separate_lines boolean DEFAULT false;
    `
    });
    console.log('Result execute_sql rpc:', e1);
}
run();
