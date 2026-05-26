let _seq = 0

export function uid(prefix = '') {
  return `${prefix}${Date.now()}_${(++_seq).toString(36)}`
}
