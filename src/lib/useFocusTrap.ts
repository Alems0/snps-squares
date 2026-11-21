import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Trap focus inside `containerRef` while active; Escape calls onEscape.
 * Restores focus to the previously focused element on unmount.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape?: () => void,
  options?: { initialFocusRef?: RefObject<HTMLElement | null> }
) {
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const container = containerRef.current
    if (!container) return

    const focusInitial = () => {
      const preferred = options?.initialFocusRef?.current
      if (preferred && container.contains(preferred)) {
        preferred.focus()
        return
      }
      const first = container.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }

    // Defer so dialog content is mounted
    const t = window.setTimeout(focusInitial, 0)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onEscapeRef.current) {
          e.preventDefault()
          e.stopPropagation()
          onEscapeRef.current()
        }
        return
      }

      if (e.key !== 'Tab') return
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null
      )
      if (nodes.length === 0) {
        e.preventDefault()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKeyDown, true)
      previousFocusRef.current?.focus?.()
    }
  }, [active, containerRef, options?.initialFocusRef])
}
