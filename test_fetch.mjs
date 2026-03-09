import fs from 'fs';
const url = "https://tdjgybsdrjmilibtnewz.supabase.co/rest/v1/calendar_events?select=*&limit=1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkamd5YnNkcmptaWxpYnRuZXd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE4MjU4MiwiZXhwIjoyMDg3NzU4NTgyfQ.P26QZytJN9EzdoquwCLOyH9537uscFLJa8NDirTjVpY";

fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    .then(res => res.json())
    .then(data => {
        if (data.length > 0) fs.writeFileSync('schema_output.json', JSON.stringify(Object.keys(data[0]), null, 2));
        else fs.writeFileSync('schema_output.json', 'No data returned');
    })
    .catch(console.error);
