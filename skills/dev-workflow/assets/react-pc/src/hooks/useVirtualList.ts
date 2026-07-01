import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVirtualListOptions {
  itemCount: number
  itemSize: number
  overscan?: number
}

interface VirtualItem {
  index: number
  offset: number
  size: number
}

export function useVirtualList({ itemCount, itemSize, overscan = 5 }: UseVirtualListOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleResize = () => {
      setContainerHeight(container.clientHeight)
    }

    const handleScroll = () => {
      setScrollTop(container.scrollTop)
    }

    handleResize()
    container.addEventListener('scroll', handleScroll)

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [])

  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - overscan)
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemSize) + overscan,
  )

  const virtualItems: VirtualItem[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      offset: i * itemSize,
      size: itemSize,
    })
  }

  const totalSize = itemCount * itemSize

  const scrollTo = useCallback(
    (index: number) => {
      containerRef.current?.scrollTo({ top: index * itemSize })
    },
    [itemSize],
  )

  return {
    containerRef,
    virtualItems,
    totalSize,
    scrollTo,
  }
}
