import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  // auth check
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = join(process.cwd(), 'public', 'uploads', filename);

    await writeFile(path, buffer);
    const url = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url, filename });
  } catch (err: any) {
    console.error('API Upload Error:', err);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}
