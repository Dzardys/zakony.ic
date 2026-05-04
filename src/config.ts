export const DATA_REPO_OWNER = 'Dzardys'
export const DATA_REPO_NAME = 'skimo-zakony'
export const DATA_BRANCH = 'main'

export const GITHUB_REPO_URL = `https://github.com/${DATA_REPO_OWNER}/${DATA_REPO_NAME}`
export const GITHUB_TREE_API = `https://api.github.com/repos/${DATA_REPO_OWNER}/${DATA_REPO_NAME}/git/trees/${DATA_BRANCH}?recursive=1`
export const RAW_BASE_URL = `https://raw.githubusercontent.com/${DATA_REPO_OWNER}/${DATA_REPO_NAME}/${DATA_BRANCH}`

export const ALLOWED_DATA_DIRS = ['laws/', 'zakony/', 'data/', 'content/', '']
export const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.json']
