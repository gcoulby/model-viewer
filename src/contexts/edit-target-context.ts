import { createContext } from 'react'
import type { ElementRef } from '@/lib/ecore/edit/dom'

export interface FocusRequest {
  /** Distinguishes repeated requests. */
  nonce: number
  /** `refId` of the element whose field should take focus. */
  refId: string
}

export interface EditTargetContextValue {
  /** The element the Properties panel edits and the tree highlights. */
  target: ElementRef | null
  /** The target's element in the current document, or null. */
  element: Element | null
  /** Targets an element. The diagram selects the type it belongs to. */
  setTarget: (ref: ElementRef | null, options?: { center?: boolean; focusName?: boolean }) => void
  /** Bumped to ask the Properties panel to focus and select its first field, as after creating something. */
  focusRequest: FocusRequest | null
  /**
   * Claims a focus request. Fields check that the request is for their own element; a claimed request stays
   * claimable only for a moment, so a field mounted later does not take focus from an old one.
   */
  takeFocus: (request: FocusRequest) => boolean
}

export const EditTargetContext = createContext<EditTargetContextValue | null>(null)
