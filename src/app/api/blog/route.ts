import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  return authCookie?.value === 'authenticated';
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM articles';
    const params: any[] = [];

    if (slug) {
      sql += ' WHERE slug = $1';
      params.push(slug);
    } else if (status) {
      sql += ' WHERE status = $1 ORDER BY created_at DESC';
      params.push(status);
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    const res = await query(sql, params);
    return NextResponse.json({ articles: res.rows });
  } catch (err: any) {
    console.error('API Blog GET Error:', err);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const { title, slug, theme, target_keywords, human_insert, content, meta_description, featured_image, status } = data;

    const res = await query(
      `INSERT INTO articles (title, slug, theme, target_keywords, human_insert, content, meta_description, featured_image, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, slug, theme, target_keywords, human_insert, content, meta_description, featured_image, status || 'draft']
    );

    return NextResponse.json({ success: true, article: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Slug URL sudah digunakan. Gunakan URL yang berbeda.' }, { status: 400 });
    console.error('API Blog POST Error:', err);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const { id, title, slug, theme, target_keywords, human_insert, content, meta_description, featured_image, status } = data;

    const res = await query(
      `UPDATE articles SET 
        title=$1, slug=$2, theme=$3, target_keywords=$4, human_insert=$5, content=$6, meta_description=$7, featured_image=$8, status=$9, updated_at=CURRENT_TIMESTAMP
       WHERE id=$10 RETURNING *`,
      [title, slug, theme, target_keywords, human_insert, content, meta_description, featured_image, status, id]
    );

    return NextResponse.json({ success: true, article: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Slug URL sudah digunakan oleh artikel lain.' }, { status: 400 });
    console.error('API Blog PUT Error:', err);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

    await query(`DELETE FROM articles WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Blog DELETE Error:', err);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
