export default {
  toArray: s => {
    try {
      return JSON.parse(s)
    } catch (error) {
      return []
    }
  }
}
