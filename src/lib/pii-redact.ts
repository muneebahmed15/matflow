/** Redact emails and phone numbers for safe logging. */
export function redactPii(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '[email]')
    .replace(/(\+?1?\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g, '[phone]')
    .replace(/\b\d{10,11}\b/g, '[phone]');
}
