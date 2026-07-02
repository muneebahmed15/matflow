import { logger } from '@/lib/logger';

export type LlmToolCall = {
  name: 'book_trial' | 'capture_lead' | 'lookup_schedule';
  args: Record<string, string>;
};

export type LlmReply = {
  message: string;
  toolCall?: LlmToolCall;
};

type GymContext = {
  gymName: string;
  gymSlug: string;
  scheduleSummary?: string;
  pricingSummary?: string;
};

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function getOpenAiKey(): string | null {
  return process.env.OPENAI_API_KEY ?? null;
}

function buildSystemPrompt(ctx: GymContext): string {
  return `You are the friendly front desk assistant for ${ctx.gymName}, a martial arts gym.
Help visitors with class schedules, pricing, and booking free trials.
When a visitor wants to book a trial or gives their contact info, use the book_trial or capture_lead tools.
Never invent prices — refer to the pricing page if unsure.
Schedule info: ${ctx.scheduleSummary ?? 'See the Schedule page on our website.'}
Pricing info: ${ctx.pricingSummary ?? 'See the Pricing page on our website.'}
Keep replies concise (2-3 sentences).`;
}

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'book_trial',
      description: 'Create a trial booking lead when visitor wants a free trial',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['first_name', 'last_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'capture_lead',
      description: 'Capture contact info from a visitor who wants follow-up',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['first_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_schedule',
      description: 'Answer questions about class schedule',
      parameters: {
        type: 'object',
        properties: {
          day: { type: 'string' },
        },
      },
    },
  },
];

export async function generateLlmReply(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  ctx: GymContext
): Promise<LlmReply> {
  const apiKey = getOpenAiKey();

  if (apiKey) {
    try {
      const messages = [
        { role: 'system' as const, content: buildSystemPrompt(ctx) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 300,
        }),
      });

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };

      const choice = data.choices?.[0]?.message;
      const toolCall = choice?.tool_calls?.[0];

      if (toolCall?.function?.name) {
        let args: Record<string, string> = {};
        try {
          args = JSON.parse(toolCall.function.arguments ?? '{}') as Record<string, string>;
        } catch {
          args = {};
        }
        return {
          message:
            choice?.content ??
            "Great! I've got your info — we'll follow up shortly to confirm your trial.",
          toolCall: {
            name: toolCall.function.name as LlmToolCall['name'],
            args,
          },
        };
      }

      if (choice?.content) {
        return { message: choice.content };
      }
    } catch (err) {
      logger.warn({ err }, 'OpenAI chat failed, falling back to keyword bot');
    }
  }

  return generateKeywordReply(userMessage, ctx);
}

function generateKeywordReply(userMessage: string, ctx: GymContext): LlmReply {
  const lower = userMessage.toLowerCase();

  const trialMatch = lower.match(
    /(?:book|schedule|sign up|register).*(?:trial|class)|(?:trial|class).*(?:book|schedule)/
  );
  if (trialMatch) {
    const nameMatch = userMessage.match(/(?:i'm|i am|my name is)\s+([a-z]+)(?:\s+([a-z]+))?/i);
    return {
      message: `I'd love to help you book a free trial at ${ctx.gymName}! What's your name and best phone number or email?`,
      toolCall: nameMatch
        ? {
            name: 'book_trial',
            args: {
              first_name: nameMatch[1] ?? '',
              last_name: nameMatch[2] ?? 'Visitor',
            },
          }
        : undefined,
    };
  }

  if (lower.includes('schedule') || lower.includes('hours') || lower.includes('class')) {
    return {
      message: `${ctx.scheduleSummary ?? 'Check our Schedule page for full class times.'} — ${ctx.gymName}`,
      toolCall: { name: 'lookup_schedule', args: {} },
    };
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('membership')) {
    return {
      message: `${ctx.pricingSummary ?? 'See our Pricing page for current membership plans.'} — ${ctx.gymName}`,
    };
  }

  if (lower.includes('hello') || lower.includes('hi')) {
    return {
      message: `Hello! Welcome to ${ctx.gymName}. I can help with schedules, pricing, and booking a free trial. What would you like to know?`,
    };
  }

  const phoneMatch = userMessage.match(/(\+?[\d\s()-]{10,})/);
  const emailMatch = userMessage.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (phoneMatch || emailMatch) {
    return {
      message: `Thanks! We'll follow up shortly. Is there anything else you'd like to know about ${ctx.gymName}?`,
      toolCall: {
        name: 'capture_lead',
        args: {
          first_name: 'Chat',
          last_name: 'Visitor',
          ...(emailMatch ? { email: emailMatch[0] } : {}),
          ...(phoneMatch ? { phone: phoneMatch[0].replace(/\D/g, '') } : {}),
        },
      },
    };
  }

  return {
    message: `Thanks for reaching out to ${ctx.gymName}! Ask about our schedule, pricing, or booking a free trial.`,
  };
}
