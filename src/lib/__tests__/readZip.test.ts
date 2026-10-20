// @vitest-environment jsdom
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { readZip } from '../readZip'

async function makeZip(names: string[]): Promise<File> {
  const zip = new JSZip()
  for (const n of names) zip.file(n, '<x/>')
  const data = await zip.generateAsync({ type: 'uint8array' })
  return new File([data as BlobPart], 'a.zip')
}

describe('readZip', () => {
  it('keeps only .ecore files and strips a single wrapping folder', async () => {
    const files = await readZip(await makeZip(['proj/core/a.ecore', 'proj/b.ecore', 'proj/readme.md', 'proj/node_modules/x.ecore']))
    expect(files.map((f) => f.path).sort()).toEqual(['b.ecore', 'core/a.ecore'])
  })

  it('keeps paths when there are several top-level entries', async () => {
    const files = await readZip(await makeZip(['one/a.ecore', 'two/b.ecore']))
    expect(files.map((f) => f.path).sort()).toEqual(['one/a.ecore', 'two/b.ecore'])
  })
})
