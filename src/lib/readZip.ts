import JSZip from 'jszip'
import { normalisePath } from './ecore/paths'
import { onlyEcore, type SourceFile } from './readFolder'

export function isZip(path: string): boolean {
  return /\.zip$/i.test(path)
}

/**
 * The `.ecore` files inside a zip, with paths relative to the archive root. Only those entries are
 * decompressed, so a large archive of other files costs little. A single top-level folder wrapping
 * everything (as most archivers add) is taken off the front.
 */
export async function readZip(archive: File): Promise<SourceFile[]> {
  const zip = await JSZip.loadAsync(archive)
  const entries = Object.values(zip.files).filter((e) => !e.dir && !e.name.startsWith('__MACOSX/'))
  const paths = entries.map((e) => normalisePath(e.name))
  const roots = new Set(paths.map((p) => p.split('/')[0]))
  const strip = roots.size === 1 && paths.every((p) => p.includes('/'))

  const wanted = entries
    .map((entry, i) => ({ entry, path: strip ? paths[i]!.slice(paths[i]!.indexOf('/') + 1) : paths[i]! }))
    .filter((e) => onlyEcore([{ file: archive, path: e.path }]).length)
  return Promise.all(
    wanted.map(async ({ entry, path }) => ({
      path,
      file: new File([await entry.async('blob')], path.slice(path.lastIndexOf('/') + 1)),
    })),
  )
}
