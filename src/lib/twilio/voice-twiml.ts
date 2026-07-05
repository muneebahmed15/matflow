export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function twimlResponse(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

export function twimlSay(message: string, voice = 'Polly.Joanna'): string {
  return `<Say voice="${voice}">${escapeXml(message)}</Say>`;
}

export function twimlGather(input: {
  action: string;
  message: string;
  timeout?: number;
}): string {
  return `<Gather input="speech dtmf" action="${escapeXml(input.action)}" timeout="${input.timeout ?? 5}">${twimlSay(input.message)}</Gather>`;
}

export function twimlDial(number: string): string {
  return `<Dial>${escapeXml(number)}</Dial>`;
}

export function twimlRecord(input: {
  action: string;
  transcribe?: boolean;
  maxLength?: number;
}): string {
  const transcribe = input.transcribe ? ' transcribe="true"' : '';
  return `<Record action="${escapeXml(input.action)}" maxLength="${input.maxLength ?? 120}"${transcribe}/>`;
}
