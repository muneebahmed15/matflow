/** OpenAI moderation check when API key is configured. */
export async function moderateUserInput(text: string): Promise<{
  flagged: boolean;
  categories: string[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { flagged: false, categories: [] };

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    });

    const data = (await response.json()) as {
      results?: Array<{
        flagged?: boolean;
        categories?: Record<string, boolean>;
      }>;
    };

    const result = data.results?.[0];
    if (!result?.flagged) return { flagged: false, categories: [] };

    const categories = Object.entries(result.categories ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    return { flagged: true, categories };
  } catch {
    return { flagged: false, categories: [] };
  }
}

export const MODERATION_BLOCK_MESSAGE =
  "I can't help with that message. Please keep questions related to classes, membership, or booking a trial.";
