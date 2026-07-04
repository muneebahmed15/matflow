import { logger } from '@/lib/logger';

export type MarketingCopyKind = 'blog_draft' | 'instagram_caption';

export type MarketingCopyContext = {
  gymName: string;
  tagline?: string | null;
  topic?: string;
  tone?: string;
};

function templateFallback(kind: MarketingCopyKind, ctx: MarketingCopyContext): string {
  const name = ctx.gymName;
  const topic = ctx.topic?.trim() || 'training at our gym';

  if (kind === 'instagram_caption') {
    return `Ready to level up? ${topic} at ${name}! 🥋 Book your free trial — link in bio.\n\n#martialarts #${name.toLowerCase().replace(/\s+/g, '')} #bjj #mma #fitness`;
  }

  return `<h2>${topic.charAt(0).toUpperCase() + topic.slice(1)}</h2>
<p>At ${name}, we help students of every age build confidence, discipline, and real skill on the mats.</p>
<p>${ctx.tagline ? `${ctx.tagline} ` : ''}Whether you are brand new or getting back into training, our coaches meet you where you are.</p>
<h3>Why train with us?</h3>
<ul>
<li>Expert coaching in a welcoming environment</li>
<li>Flexible class schedule for busy lives</li>
<li>Free trial for new students</li>
</ul>
<p>Ready to start? Book your free trial on our website today.</p>`;
}

export async function generateMarketingCopy(
  kind: MarketingCopyKind,
  ctx: MarketingCopyContext
): Promise<{ text: string; source: 'openai' | 'template' }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: templateFallback(kind, ctx), source: 'template' };
  }

  const system =
    kind === 'instagram_caption'
      ? 'Write a short Instagram caption for a martial arts gym. Include 1-2 emojis and 4-6 hashtags. Max 220 words.'
      : 'Write SEO-friendly blog HTML for a martial arts gym. Use h2, h3, p, ul tags only. 250-400 words.';

  const user = `Gym: ${ctx.gymName}
Tagline: ${ctx.tagline ?? 'none'}
Topic: ${ctx.topic ?? 'general martial arts training'}
Tone: ${ctx.tone ?? 'welcoming and professional'}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: kind === 'instagram_caption' ? 200 : 800,
      }),
    });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) return { text, source: 'openai' };
  } catch (err) {
    logger.warn({ err, kind }, 'Marketing copy generation failed');
  }

  return { text: templateFallback(kind, ctx), source: 'template' };
}
