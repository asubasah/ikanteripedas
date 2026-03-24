import { NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { cookies } from 'next/headers';

const uploadsDir = join(process.cwd(), 'public', 'uploads');

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const files = await readdir(uploadsDir);
    const fileStats = await Promise.all(
      files.map(async (filename) => {
        const filePath = join(uploadsDir, filename);
        const stats = await stat(filePath);
        return {
          name: filename,
          size: stats.size, // in bytes
          timestamp: stats.mtime,
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/${filename}`
        };
      })
    );
    
    // Sort by newest first
    fileStats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return NextResponse.json({ success: true, files: fileStats });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
       return NextResponse.json({ success: true, files: [] }); // Directory might not exist yet
    }
    console.error('Error fetching files:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('name');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename is required' }, { status: 400 });
    }

    // Security check to prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
        return NextResponse.json({ success: false, error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = join(uploadsDir, filename);
    await unlink(filePath);
    
    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
  }
}
