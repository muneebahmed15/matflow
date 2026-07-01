type JsonLdPayload = Record<string, unknown> | Record<string, unknown>[]

export function serializeJsonLd(data: JsonLdPayload) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function JsonLd({ data }: { data: JsonLdPayload }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
