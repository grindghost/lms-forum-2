import DOMPurify from 'dompurify'

export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true }
  })
}