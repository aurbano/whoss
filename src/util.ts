import isString from 'lodash/isString'

import { Author } from './constants'

export function getAttributionForAuthor(a: Author) {
  return isString(a)
    ? a
    : a.name + (a.email || a.homepage || a.url ? ` <${a.email || a.homepage || a.url}>` : '')
}
