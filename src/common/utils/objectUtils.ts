export function isEmpty(obj: object): boolean {
  for (var _ in obj) return false
  return true
}
