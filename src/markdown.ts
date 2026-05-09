import { escapeHtml, parseInlineMarkdown, slugify } from './utils'

function isLawOverviewHeading(text: string): boolean {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') === 'tento zakon upravuje:'
}

function isSignatureImage(alt: string, src: string, previousElementWasHr: boolean): boolean {
  const haystack = `${alt} ${src}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return previousElementWasHr || /(^|[-_\s/.])(podpis|signature|sign|parafa)([-_\s/.]|$)/.test(haystack)
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let unorderedListOpen = false
  let orderedListOpen = false
  let codeOpen = false
  let codeBuffer: string[] = []
  let previousElementWasHr = false

  const flushParagraph = () => {
    if (!paragraph.length) return

    const rawText = paragraph.join(' ')
    const className = isLawOverviewHeading(rawText) ? ' class="law-overview-heading"' : ''

    html.push(`<p${className}>${parseInlineMarkdown(rawText)}</p>`)
    paragraph = []
    previousElementWasHr = false
  }

  const closeLists = () => {
    let closed = false

    if (unorderedListOpen) {
      html.push('</ul>')
      unorderedListOpen = false
      closed = true
    }

    if (orderedListOpen) {
      html.push('</ol>')
      orderedListOpen = false
      closed = true
    }

    if (closed) previousElementWasHr = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      flushParagraph()
      closeLists()

      if (codeOpen) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
        codeBuffer = []
        codeOpen = false
      } else {
        codeOpen = true
      }

      continue
    }

    if (codeOpen) {
      codeBuffer.push(rawLine)
      continue
    }

    if (!line) {
      flushParagraph()
      continue
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)
    if (imageMatch) {
      flushParagraph()
      closeLists()

      const rawAlt = imageMatch[1]
      const rawSrc = imageMatch[2]
      const alt = escapeHtml(rawAlt)
      const src = escapeHtml(rawSrc)
      const className = isSignatureImage(rawAlt, rawSrc, previousElementWasHr) ? ' class="signature-image"' : ''

      html.push(`<img${className} src="${src}" alt="${alt}" loading="lazy" />`)
      previousElementWasHr = false
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      closeLists()

      const level = Math.min(heading[1].length, 4)
      const text = heading[2].trim()
      const id = slugify(text)

      html.push(`<h${level} id="${id}">${parseInlineMarkdown(text)}</h${level}>`)
      previousElementWasHr = false
      continue
    }

    const hr = line.match(/^---+$/)
    if (hr) {
      flushParagraph()
      closeLists()
      html.push('<hr />')
      previousElementWasHr = true
      continue
    }

    const unorderedListItem = line.match(/^[-*]\s+(.+)$/)
    if (unorderedListItem) {
      flushParagraph()

      if (orderedListOpen) {
        html.push('</ol>')
        orderedListOpen = false
      }

      if (!unorderedListOpen) {
        html.push('<ul>')
        unorderedListOpen = true
      }

      html.push(`<li>${parseInlineMarkdown(unorderedListItem[1])}</li>`)
      previousElementWasHr = false
      continue
    }

    const orderedListItem = line.match(/^\d+\.\s+(.+)$/)
    if (orderedListItem) {
      flushParagraph()

      if (unorderedListOpen) {
        html.push('</ul>')
        unorderedListOpen = false
      }

      if (!orderedListOpen) {
        html.push('<ol>')
        orderedListOpen = true
      }

      html.push(`<li>${parseInlineMarkdown(orderedListItem[1])}</li>`)
      previousElementWasHr = false
      continue
    }

    closeLists()
    paragraph.push(line)
  }

  flushParagraph()
  closeLists()

  if (codeOpen) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
  }

  return html.join('\n')
}