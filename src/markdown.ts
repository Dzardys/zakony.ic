import { escapeHtml, parseInlineMarkdown, slugify, stripMarkdown } from './utils'

function normalizePlainText(text: string): string {
  return stripMarkdown(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isLawOverviewHeading(text: string): boolean {
  return normalizePlainText(text) === 'tento zakon upravuje:'
}

function isSignatureImageByName(alt: string, src: string): boolean {
  const haystack = `${alt} ${src}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return /(^|[-_\s/.])(podpis|signature|sign|parafa)([-_\s/.]|$)/.test(haystack)
}

function previousMeaningfulLineIsHr(lines: string[], index: number): boolean {
  for (let i = index - 1; i >= 0; i -= 1) {
    const line = lines[i].trim()
    if (!line) continue
    return /^---+$/.test(line)
  }

  return false
}

function imageLooksLikeTrailingSignature(lines: string[], index: number): boolean {
  if (!previousMeaningfulLineIsHr(lines, index)) return false

  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line) continue

    if (/^#{1,6}\s+/.test(line)) return false
    if (/^!\[[^\]]*\]\((https?:\/\/[^)]+)\)$/.test(line)) return false
    if (/^---+$/.test(line)) return false
  }

  return true
}

function isSignatureImage(alt: string, src: string, lines: string[], index: number): boolean {
  return isSignatureImageByName(alt, src) || imageLooksLikeTrailingSignature(lines, index)
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []

  let paragraph: string[] = []
  let unorderedListOpen = false
  let orderedListOpen = false
  let codeOpen = false
  let codeBuffer: string[] = []
  let lawOverviewBlockOpen = false

  const openLawOverviewBlock = () => {
    if (!lawOverviewBlockOpen) {
      html.push('<div class="law-overview-block">')
      lawOverviewBlockOpen = true
    }
  }

  const closeLawOverviewBlock = () => {
    if (lawOverviewBlockOpen) {
      html.push('</div>')
      lawOverviewBlockOpen = false
    }
  }

  const flushParagraph = () => {
    if (!paragraph.length) return

    const rawText = paragraph.join(' ')
    const isOverviewHeading = isLawOverviewHeading(rawText)

    if (isOverviewHeading) openLawOverviewBlock()

    const className = isOverviewHeading ? ' class="law-overview-heading"' : ''
    html.push(`<p${className}>${parseInlineMarkdown(rawText)}</p>`)
    paragraph = []
  }

  const closeLists = () => {
    if (unorderedListOpen) {
      html.push('</ul>')
      unorderedListOpen = false
    }

    if (orderedListOpen) {
      html.push('</ol>')
      orderedListOpen = false
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      flushParagraph()
      closeLists()
      closeLawOverviewBlock()

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
      closeLawOverviewBlock()

      const rawAlt = imageMatch[1]
      const rawSrc = imageMatch[2]
      const alt = escapeHtml(rawAlt)
      const src = escapeHtml(rawSrc)
      const className = isSignatureImage(rawAlt, rawSrc, lines, index) ? ' class="signature-image"' : ''

      html.push(`<img${className} src="${src}" alt="${alt}" loading="lazy" />`)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)

    if (heading) {
      flushParagraph()
      closeLists()
      closeLawOverviewBlock()

      const level = Math.min(heading[1].length, 4)
      const text = heading[2].trim()
      const id = slugify(text)

      html.push(`<h${level} id="${id}">${parseInlineMarkdown(text)}</h${level}>`)
      continue
    }

    const hr = line.match(/^---+$/)

    if (hr) {
      flushParagraph()
      closeLists()
      closeLawOverviewBlock()
      html.push('<hr />')
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
      continue
    }

    closeLists()
    paragraph.push(line)
  }

  flushParagraph()
  closeLists()
  closeLawOverviewBlock()

  if (codeOpen) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
  }

  return html.join('\n')
}
