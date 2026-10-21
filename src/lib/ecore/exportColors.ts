import type { ExportColors } from './export'

/** The current theme's colours, read from the CSS variables, for drawing the diagram as SVG. */
export function readExportColors(): ExportColors {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => style.getPropertyValue(name).trim()
  return {
    background: read('--background'),
    node: read('--node'),
    ink: read('--foreground'),
    muted: read('--muted-foreground'),
    edge: read('--edge'),
    halo: read('--halo'),
    cycle: read('--cycle'),
    selection: read('--selection'),
  }
}
