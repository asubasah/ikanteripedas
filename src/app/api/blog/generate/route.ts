import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''; // Usually provided in .env
const OPENROUTER_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001'; // Use env or fallback to stable model

export async function POST(req: Request) {
  // Validate Authentication
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, theme, human_insert, uploaded_images = [] } = await req.json();

    const systemPrompt = `
You are an expert SEO Content Writer for MK Metal Indo, an industrial laser cutting and sheet metal fabrication company in Sidoarjo, Indonesia.
Your task is to write a highly SEO-optimized article in Indonesian based on the following attributes:

TITLE: ${title}
THEME/TOPIC: ${theme}

CRITICAL RULES YOU MUST FOLLOW EXACTLY:
1. TARGET KEYWORDS: Automatically generate 3-5 highly relevant long-tail keywords for this article. Weave them naturally throughout the text, especially in H2/H3 headers and the opening paragraph.
2. HUMAN INSERT: You MUST insert the following exact text seamlessly into the article somewhere appropriate. Do not change a single word of it. This is to ensure a human tone and avoid 100% AI flavor penalization by Google:
<HUMAN_INSERT_TEXT>
${human_insert || '(No specific human text provided. Write naturally)'}
</HUMAN_INSERT_TEXT>
3. IMAGES: The user has uploaded the following images: ${uploaded_images.length > 0 ? uploaded_images.join(', ') : 'None'}. 
You MUST weave these exact image URLs into the article content as HTML tags with descriptive SEO alt text. For example: <img src="/uploads/filename.jpg" alt="SEO Optimized Alt" />
If no images were uploaded, do not include any image tags.
4. FORMATTING & CTA: Return the content as fully formatted HTML (<h1>, <h2>, <p>, <ul>, <strong>). End with a professional Call to Action to contact MK Metal Indo via WhatsApp.
5. JSON OUTPUT: You MUST return ONLY a valid JSON object with the following structure. Do NOT wrap it in markdown block quotes.
{
  "slug": "generated-seo-friendly-url-slug-kebab-case",
  "target_keywords": "comma, separated, long, tail, keywords",
  "meta_description": "Compelling SEO meta description max 160 chars",
  "content": "The full formatted HTML content here"
}
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        response_format: { type: "json_object" },
        messages: [
            { role: 'system', content: systemPrompt }, 
            { role: 'user', content: 'Generate the article JSON now.' }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter Error: ${response.statusText}`);
    }

    const data = await response.json();
    let resultStr = data.choices[0].message.content;

    // Failsafe: if markdown formatting was used, strip the outer ```json and ```
    if (resultStr.startsWith('\`\`\`json')) resultStr = resultStr.substring(7).trim();
    if (resultStr.startsWith('\`\`\`')) resultStr = resultStr.substring(3).trim();
    if (resultStr.endsWith('\`\`\`')) resultStr = resultStr.substring(0, resultStr.length - 3).trim();

    const parsed = JSON.parse(resultStr);

    return NextResponse.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('API Blog Generate Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate article' }, { status: 500 });
  }
}
