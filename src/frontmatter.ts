type FrontmatterResult = {
  attributes: Record<string, unknown>
  body: string
}

function parseScalar(value: string): string | boolean | number | null {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed.replace(/^['"]|['"]$/g, '')
}

export function parseFrontmatter(raw: string): FrontmatterResult {
  if (!raw.startsWith('---')) return { attributes: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { attributes: {}, body: raw }

  const yaml = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\s+/, '')
  const attributes: Record<string, unknown> = {}
  const lines = yaml.split(/\r?\n/)

  let currentArrayKey: string | null = null
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) continue

    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (keyValue) {
      const [, key, value] = keyValue
      if (value === '') {
        const nextLine = lines[i + 1]
        if (nextLine && /^\s*-/.test(nextLine)) {
          attributes[key] = []
          currentArrayKey = key
        } else {
          attributes[key] = ''
          currentArrayKey = null
        }
      } else {
        attributes[key] = parseScalar(value)
        currentArrayKey = null
      }
      continue
    }

    const arrayItem = line.match(/^\s*-\s*(.*)$/)
    if (arrayItem && currentArrayKey) {
      const arr = attributes[currentArrayKey] as unknown[]
      const item = arrayItem[1]
      const inlineObject = item.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (inlineObject) {
        const object: Record<string, unknown> = { [inlineObject[1]]: parseScalar(inlineObject[2]) }
        while (i + 1 < lines.length && /^\s{4,}[A-Za-z0-9_-]+:/.test(lines[i + 1])) {
          i += 1
          const nested = lines[i].match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/)
          if (nested) object[nested[1]] = parseScalar(nested[2])
        }
        arr.push(object)
      } else {
        arr.push(parseScalar(item))
      }
    }
  }

  return { attributes, body }
}
