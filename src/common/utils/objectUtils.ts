export function isEmpty(obj: object): boolean {
  for (let _ in obj) return false
  return true
}
