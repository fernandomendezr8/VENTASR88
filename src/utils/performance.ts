/**
 * Utilidades de rendimiento para optimizar la aplicación
 */

// Debounce para búsquedas
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle para eventos frecuentes
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Cache simple para resultados de funciones
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private ttl: number

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Formatters memoizados
const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'COP'
})

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

export const formatCurrency = (amount: number): string => {
  return currencyFormatter.format(amount)
}

export const formatDate = (date: string | Date): string => {
  return dateFormatter.format(new Date(date))
}

export const formatDateTime = (date: string | Date): string => {
  return dateTimeFormatter.format(new Date(date))
}

// Batch de operaciones para reducir re-renders
export class BatchProcessor<T> {
  private batch: T[] = []
  private timeout: NodeJS.Timeout | null = null
  private processor: (items: T[]) => void

  constructor(processor: (items: T[]) => void, delay: number = 100) {
    this.processor = processor
  }

  add(item: T): void {
    this.batch.push(item)
    
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      this.flush()
    }, 100)
  }

  flush(): void {
    if (this.batch.length > 0) {
      this.processor([...this.batch])
      this.batch = []
    }
    
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }
}

// Lazy loading de imágenes
export const createImageLoader = () => {
  const imageCache = new Set<string>()
  
  return (src: string): Promise<string> => {
    if (imageCache.has(src)) {
      return Promise.resolve(src)
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        imageCache.add(src)
        resolve(src)
      }
      img.onerror = reject
      img.src = src
    })
  }
}

// Optimización de listas virtualizadas
export const calculateVisibleItems = (
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  totalItems: number,
  overscan: number = 5
) => {
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    totalItems - 1
  )

  return {
    start: Math.max(0, visibleStart - overscan),
    end: Math.min(totalItems - 1, visibleEnd + overscan),
    visibleStart,
    visibleEnd
  }
}

// Optimización de búsquedas
export const createSearchIndex = <T>(
  items: T[],
  searchFields: (keyof T)[]
): Map<string, T[]> => {
  const index = new Map<string, T[]>()
  
  items.forEach(item => {
    searchFields.forEach(field => {
      const value = String(item[field]).toLowerCase()
      const words = value.split(/\s+/)
      
      words.forEach(word => {
        if (word.length > 2) { // Solo indexar palabras de más de 2 caracteres
          if (!index.has(word)) {
            index.set(word, [])
          }
          index.get(word)!.push(item)
        }
      })
    })
  })
  
  return index
}

// Performance monitor
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(name: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.addMetric(name, duration)
    }
  }

  addMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Mantener solo los últimos 100 valores
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetrics(name: string): { avg: number; min: number; max: number } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    return { avg, min, max }
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number }> {
    const result: Record<string, { avg: number; min: number; max: number }> = {}
    
    this.metrics.forEach((values, name) => {
      const metrics = this.getMetrics(name)
      if (metrics) {
        result[name] = metrics
      }
    })
    
    return result
  }

  clear(): void {
    this.metrics.clear()
  }
}

// Hook personalizado para performance
export const usePerformanceTimer = (name: string) => {
  const monitor = PerformanceMonitor.getInstance()
  
  return {
    startTimer: () => monitor.startTimer(name),
    getMetrics: () => monitor.getMetrics(name)
  }
}