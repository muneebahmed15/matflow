import { NextResponse } from 'next/server';
import type { z } from 'zod';

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

function validationErrorResponse(error: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', details: error.flatten() },
    { status: 400 }
  );
}

/** Parse a JSON request body against a Zod schema. Never throws on malformed JSON. */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<ParseResult<z.infer<T>>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }

  return { success: true, data: parsed.data };
}

/** Parse URL search params against a Zod schema. */
export function parseSearchParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): ParseResult<z.infer<T>> {
  const parsed = schema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }

  return { success: true, data: parsed.data };
}
