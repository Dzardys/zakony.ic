export type Amendment = {
  date?: string
  title: string
  description?: string
}

export type Law = {
  id: string
  slug: string
  number?: string
  title: string
  category?: string
  status?: string
  effectiveFrom?: string
  lastUpdated?: string
  amendments: Amendment[]
  content: string
  plainText: string
  path: string
  sourceUrl: string
  rawUrl: string
}

export type GithubTreeItem = {
  path: string
  type: 'blob' | 'tree' | string
  url: string
}
