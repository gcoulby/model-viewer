/** Runs `callback` once React Flow has had a frame to absorb the latest node changes. */
export function afterPaint(callback: () => void): () => void {
  let second = 0
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(callback)
  })
  return () => {
    cancelAnimationFrame(first)
    cancelAnimationFrame(second)
  }
}
