import type { ReactNode } from "react"

// Only http/https are recognized, so a pasted "javascript:" string stays inert text.
const URL_PATTERN = /https?:\/\/[^\s]+/g

// Trailing punctuation is nearly always the sentence's, not the URL's ("veja https://x.com/a.").
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>"']+$/

const MAX_LABEL = 48

// A long URL drowns out the text around it, so the visible label is shortened to
// host/first-segment/… while the href keeps the full URL. Nothing is shortened in the
// database — this is presentation only.
function linkLabel(raw: string): string {
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, "")
    const rest = (url.pathname + url.search).replace(/\/$/, "")
    if (!rest) return host
    if ((host + rest).length <= MAX_LABEL) return host + rest
    const firstSegment = url.pathname.split("/").filter(Boolean)[0]
    return firstSegment ? `${host}/${firstSegment}/…` : `${host}/…`
  } catch {
    return raw
  }
}

/**
 * Renders user-typed text, turning bare http(s) URLs into links. The text is split into
 * React nodes rather than injected as HTML, so there is no XSS surface.
 *
 * Returns a fragment, not a block element — the caller keeps control of styling. Pair it
 * with `wrap-anywhere` on the wrapper: `overflow-wrap: break-word` does not lower a box's
 * min-content size, so an unbreakable token still blows out a grid/flex parent.
 */
export function LinkifiedText({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  let cursor = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const matched = match[0]
    const start = match.index
    const href = matched.replace(TRAILING_PUNCTUATION, "")

    // A bare "https://" with nothing usable after it isn't worth linking.
    if (!href || href === "https://" || href === "http://") continue

    if (start > cursor) nodes.push(text.slice(cursor, start))
    nodes.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={href}
        className="text-primary underline"
      >
        {linkLabel(href)}
      </a>
    )
    // Punctuation trimmed off the href above belongs back in the sentence.
    nodes.push(matched.slice(href.length))
    cursor = start + matched.length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))

  return <>{nodes}</>
}
