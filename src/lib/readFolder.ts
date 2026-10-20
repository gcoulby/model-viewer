import { normalisePath } from './ecore/paths'

export interface SourceFile {
  file: File
  /** Path relative to the opened folder, `/`-separated. */
  path: string
}

const FOLDER_EXTENSION = /\.ecore$/i
const SKIPPED_FOLDERS = new Set(['node_modules'])

function isSkipped(path: string): boolean {
  return path.split('/').slice(0, -1).some((part) => part.startsWith('.') || SKIPPED_FOLDERS.has(part))
}

/** Keeps the `.ecore` files of a scanned folder, leaving out hidden and dependency folders. */
function onlyEcore(files: SourceFile[]): SourceFile[] {
  return files.filter((f) => FOLDER_EXTENSION.test(f.path) && !isSkipped(f.path))
}

/** Files from an `<input webkitdirectory>`, with the chosen folder's own name taken off the front. */
export function filesFromFolderInput(files: File[]): SourceFile[] {
  return onlyEcore(
    files.map((file) => {
      const path = normalisePath(file.webkitRelativePath || file.name)
      return { file, path: path.includes('/') ? path.slice(path.indexOf('/') + 1) : path }
    }),
  )
}

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject))
}

async function walk(entry: FileSystemEntry, prefix: string, out: SourceFile[]): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))
    out.push({ file, path })
    return
  }
  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  // readEntries returns results in batches, so keep reading until it comes back empty.
  for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader)) {
    for (const child of batch) await walk(child, path, out)
  }
}

export interface DroppedFiles {
  files: SourceFile[]
  /** True when a folder was dropped, so only `.ecore` files were picked out of it. */
  scanned: boolean
}

/** Files and folders from a drop. Must be called synchronously from the drop handler. */
export function readDropped(data: DataTransfer): Promise<DroppedFiles> {
  const entries = Array.from(data.items ?? [])
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((e): e is FileSystemEntry => e !== null)
  if (!entries.length) {
    return Promise.resolve({ files: Array.from(data.files).map((file) => ({ file, path: file.name })), scanned: false })
  }
  return (async () => {
    const scanned = entries.some((e) => e.isDirectory)
    // A single dropped folder is the root, so its own name is not part of the paths inside it.
    const single = entries.length === 1 && entries[0]?.isDirectory
    const out: SourceFile[] = []
    for (const entry of entries) {
      if (single && entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader()
        for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader)) {
          for (const child of batch) await walk(child, '', out)
        }
      } else {
        await walk(entry, '', out)
      }
    }
    return { files: scanned ? onlyEcore(out) : out, scanned }
  })()
}
