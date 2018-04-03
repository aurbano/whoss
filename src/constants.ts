import os from 'os'

export type Options = {
  baseDir: Array<string>
  outputDir: string
}

export type Author = {
  name: string
  email: string
  homepage: string
  url: string
}

export const DEFAULT_SEPARATOR = `${os.EOL}${os.EOL}******************************${os.EOL}${
  os.EOL
}`
