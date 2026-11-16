const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** How the platform writes a shortcut that uses Cmd on a Mac and Ctrl elsewhere, e.g. "⌘Z" or "Ctrl+Z". */
export function modKey(key: string, shift = false): string {
  if (isMac) return `${shift ? '⇧' : ''}⌘${key}`
  return `Ctrl+${shift ? 'Shift+' : ''}${key}`
}

/** True when keys typed now go into a text field rather than to the app. */
export function typingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

// Menus may ask more than once as they close (a submenu, then its parent), so the answer holds for a moment.
const FIELD_FOCUS_MS = 1000
const menuFocus = { at: -Infinity }

/** Called by actions that will focus a text field, such as making something new to type its name. */
export function focusGoesToField() {
  menuFocus.at = performance.now()
}

/**
 * For a menu's `finalFocus`: hand focus back to the menu's button, unless the chosen item is about to move
 * it into a text field. Menus decide this as they start to close, before the field exists, hence the flag.
 */
export function restoreFocusUnlessTyping(): boolean {
  const keep = performance.now() - menuFocus.at < FIELD_FOCUS_MS || typingInField(document.activeElement)
  return !keep
}

const RECLAIM_MS = 500

/**
 * Focuses and selects a field. A menu that has just closed may hand focus back to its button a moment later,
 * so for a short while focus that leaves without the user clicking or typing is brought back.
 */
export function focusField(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el) return
  el.focus()
  el.select()
  const until = performance.now() + RECLAIM_MS
  const reclaim = (event: FocusEvent) => {
    if (performance.now() > until || !el.isConnected) return stop()
    if (event.target !== el && !typingInField(event.target)) {
      // Focusing again from inside a focus event is ignored, so it waits for the event to finish.
      setTimeout(() => {
        if (!el.isConnected) return
        el.focus()
        el.select()
      })
    }
  }
  const stop = () => {
    document.removeEventListener('focusin', reclaim, true)
    document.removeEventListener('pointerdown', stop, true)
    document.removeEventListener('keydown', stop, true)
  }
  document.addEventListener('focusin', reclaim, true)
  document.addEventListener('pointerdown', stop, true)
  document.addEventListener('keydown', stop, true)
  setTimeout(stop, RECLAIM_MS + 100)
}
