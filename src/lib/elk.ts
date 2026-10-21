import type { ELK } from 'elkjs/lib/elk-api'
import workerUrl from 'elkjs/lib/elk-worker.min.js?url'

let instance: Promise<ELK> | null = null

/** One shared ELK, loaded on first use and run in a worker so a big layout never freezes the page. */
export function loadElk(): Promise<ELK> {
  instance ??= import('elkjs/lib/elk-api')
    .then(({ default: Elk }) => new Elk({ workerUrl }))
    .catch((error: unknown) => {
      instance = null
      throw error
    })
  return instance
}
