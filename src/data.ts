import { ALLOWED_DATA_DIRS, ALLOWED_EXTENSIONS, DATA_BRANCH, DATA_REPO_NAME, DATA_REPO_OWNER, GITHUB_REPO_URL, GITHUB_TREE_API, RAW_BASE_URL } from './config'
import { parseFrontmatter } from './frontmatter'
import type { GithubTreeItem, Law } from './types'
import { ensureArrayOfAmendments, getFirstHeading, inferNumberFromText, slugify, stripMarkdown } from './utils'

function isLawCandidate(path: string): boolean {
  const lowerPath = path.toLowerCase()
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) => lowerPath.endsWith(extension))
  if (!hasAllowedExtension) return false
  if (lowerPath.endsWith('readme.md')) return false
  if (lowerPath.includes('license')) return false
  return ALLOWED_DATA_DIRS.some((directory) => directory === '' || lowerPath.startsWith(directory))
}

function rawUrl(path: string): string {
  return `${RAW_BASE_URL}/${path}`
}

function sourceUrl(path: string): string {
  return `${GITHUB_REPO_URL}/blob/${DATA_BRANCH}/${path}`
}

function getString(attrs: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = attrs[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return undefined
}

function lawFromMarkdown(raw: string, path: string): Law {
  const { attributes, body } = parseFrontmatter(raw)
  const filename = path.split('/').pop()?.replace(/\.(md|markdown)$/i, '') ?? path
  const title = getString(attributes, ['title', 'name', 'nazev']) ?? getFirstHeading(body) ?? filename
  const number = getString(attributes, ['number', 'cislo', 'lawNumber']) ?? inferNumberFromText(`${title}\n${body}`)
  const id = getString(attributes, ['id']) ?? number?.replace('/', '-') ?? slugify(filename)
  const content = body.trim()

  return {
    id,
    slug: slugify(id),
    number,
    title,
    category: getString(attributes, ['category', 'kategorie', 'section']),
    status: getString(attributes, ['status', 'stav']),
    effectiveFrom: getString(attributes, ['effectiveFrom', 'effective_from', 'ucinnost', 'validFrom', 'valid_from']),
    lastUpdated: getString(attributes, ['lastUpdated', 'last_updated', 'updated', 'upraveno', 'novelizovano']),
    amendments: ensureArrayOfAmendments(attributes.amendments ?? attributes.novely ?? attributes.changes),
    content,
    plainText: stripMarkdown(content),
    path,
    sourceUrl: sourceUrl(path),
    rawUrl: rawUrl(path),
  }
}

function lawFromJson(raw: string, path: string): Law {
  const data = JSON.parse(raw) as Record<string, unknown>
  const filename = path.split('/').pop()?.replace(/\.json$/i, '') ?? path
  const title = getString(data, ['title', 'name', 'nazev']) ?? filename
  const number = getString(data, ['number', 'cislo', 'lawNumber'])
  const id = getString(data, ['id']) ?? number?.replace('/', '-') ?? slugify(filename)
  const content = getString(data, ['content', 'body', 'text', 'markdown']) ?? ''

  return {
    id,
    slug: slugify(id),
    number,
    title,
    category: getString(data, ['category', 'kategorie', 'section']),
    status: getString(data, ['status', 'stav']),
    effectiveFrom: getString(data, ['effectiveFrom', 'effective_from', 'ucinnost', 'validFrom', 'valid_from']),
    lastUpdated: getString(data, ['lastUpdated', 'last_updated', 'updated', 'upraveno', 'novelizovano']),
    amendments: ensureArrayOfAmendments(data.amendments ?? data.novely ?? data.changes),
    content,
    plainText: stripMarkdown(content),
    path,
    sourceUrl: sourceUrl(path),
    rawUrl: rawUrl(path),
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Nepodařilo se načíst ${url} (${response.status})`)
  return response.text()
}

async function fetchTree(): Promise<GithubTreeItem[]> {
  const response = await fetch(GITHUB_TREE_API, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) throw new Error(`Nepodařilo se načíst strom repozitáře ${DATA_REPO_OWNER}/${DATA_REPO_NAME}`)
  const payload = await response.json() as { tree?: GithubTreeItem[] }
  return payload.tree ?? []
}

export async function loadLaws(): Promise<Law[]> {
  const tree = await fetchTree()
  const files = tree
    .filter((item) => item.type === 'blob')
    .filter((item) => isLawCandidate(item.path))
    .sort((a, b) => a.path.localeCompare(b.path, 'cs'))

  const laws: Law[] = []
  for (const file of files) {
    try {
      const raw = await fetchText(rawUrl(file.path))
      const law = file.path.toLowerCase().endsWith('.json')
        ? lawFromJson(raw, file.path)
        : lawFromMarkdown(raw, file.path)
      if (law.content || law.title) laws.push(law)
    } catch (error) {
      console.warn(`Soubor ${file.path} byl přeskočen`, error)
    }
  }

  return laws.sort((a, b) => {
    const numberCompare = (a.number ?? a.id).localeCompare(b.number ?? b.id, 'cs', { numeric: true })
    if (numberCompare !== 0) return numberCompare
    return a.title.localeCompare(b.title, 'cs')
  })
}
