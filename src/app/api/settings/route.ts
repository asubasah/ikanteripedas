import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query(`SELECT setting_key, setting_value FROM app_settings`);
    const settings = res.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
    
    // Default fallbacks if not found
    if (!settings['sales_contact_number']) {
      settings['sales_contact_number'] = '08961722712';
    }
    if (!settings['ai_system_prompt']) {
      settings['ai_system_prompt'] = '';
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { salesContactNumber, aiSystemPrompt } = await req.json();
    
    if (salesContactNumber) {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value) VALUES ('sales_contact_number', $1) 
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
        [salesContactNumber]
      );
    }

    if (aiSystemPrompt !== undefined) {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value) VALUES ('ai_system_prompt', $1) 
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
        [aiSystemPrompt]
      );
    }
    
    return NextResponse.json({ success: true, salesContactNumber, aiSystemPrompt });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
