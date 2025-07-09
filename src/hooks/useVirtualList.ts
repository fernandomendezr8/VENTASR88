import { useState, useEffect, useMemo } from 'react'

interface UseVirtualListOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

interface VirtualListResult {
  virtualItems: Array<{
    index: number
    start: number
    end: number
  }>
  totalHeight: number
  scrollToIndex: (index: number) => void
}

/**
 * Hook para virtualización de listas largas
 * Mejora el rendimiento renderizando solo elementos visibles
 */
export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
): VirtualListResult {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const virtualItems = useMemo(() => {
    const itemCount = items.length
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      itemCount - 1
    )

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(itemCount - 1, visibleEnd + overscan)

    const virtualItems = []
    for (let i = start; i <= end; i++) {
      virtualItems.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight
      })
    }

    return virtualItems
  }, [items.length, itemHeight, containerHeight, scrollTop, overscan])

  const totalHeight = items.length * itemHeight

  const scrollToIndex = (index: number) => {
    const scrollTop = index * itemHeight
    setScrollTop(scrollTop)
  }

  return {
    virtualItems,
    totalHeight,
    scrollToIndex
  }
}

/**
 * Hook para manejar el scroll de listas virtualizadas
 */
export function useVirtualScroll(
  onScroll: (scrollTop: number) => void,
  throttleMs: number = 16
) {
  const [isScrolling, setIsScrolling] = useState(false)

  const handleScroll = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let lastScrollTime = 0

    return (event: React.UIEvent<HTMLDivElement>) => {
      const now = Date.now()
      const scrollTop = event.currentTarget.scrollTop

      // Throttle scroll events
      if (now - lastScrollTime >= throttleMs) {
        onScroll(scrollTop)
        lastScrollTime = now
      }

      setIsScrolling(true)

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }
  }, [onScroll, throttleMs])

  return {
    handleScroll,
    isScrolling
  }
}