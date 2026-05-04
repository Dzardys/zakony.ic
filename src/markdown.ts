import { escapeHtml, parseInlineMarkdown, slugify } from './utils'

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let unorderedListOpen = false
  let orderedListOpen = false
  let codeOpen = false
  let codeBuffer: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${parseInlineMarkdown(paragraph.join(' '))}</p>`)
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
      closeLists()
      continue
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)
    if (imageMatch) {
      flushParagraph()
      closeLists()

      const alt = escapeHtml(imageMatch[1])
      const src = escapeHtml(imageMatch[2])

      html.push(`<img src="${src}" alt="${alt}" loading="lazy" />`)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      closeLists()

      const level = Math.min(heading[1].length, 4)
      const text = heading[2].trim()
      const id = slugify(text)

      html.push(`<h${level} id="${id}"><a href="#${id}" aria-label="Odkaz na sekci">#</a>${parseInlineMarkdown(text)}</h${level}>`)
      continue
    }

    const hr = line.match(/^---+$/)
    if (hr) {
      flushParagraph()
      closeLists()
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

    paragraph.push(line)
  }

  flushParagraph()
  closeLists()

  if (codeOpen) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
  }

  return html.join('\n')
}