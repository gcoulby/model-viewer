import JSZip from 'jszip'
import { downloadBlob } from '@/lib/download'
import type { WorkspaceFile } from './workspace'

const XML_TYPE = 'application/xml'

const baseName = (path: string) => path.split('/').pop() || path

/** Downloads one file as itself, or several as a zip that keeps their folder paths. */
export async function downloadFiles(files: WorkspaceFile[], zipName = 'ecore-models.zip'): Promise<void> {
  const [only] = files
  if (!only) return
  if (files.length === 1) {
    downloadBlob(baseName(only.name), new Blob([only.text], { type: XML_TYPE }))
    return
  }
  const zip = new JSZip()
  for (const file of files) zip.file(file.name, file.text)
  downloadBlob(zipName, await zip.generateAsync({ type: 'blob' }))
}
