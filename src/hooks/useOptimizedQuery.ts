import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { SimpleCache } from '../utils/performance'

interface QueryOptions {
  cacheKey?: string
  cacheTTL?: number
  enabled?: boolean
  refetchOnWindowFocus?: boolean
}

interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook optimizado para consultas a Supabase con cache y control de estado
 */
export function useOptimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    cacheKey,
    cacheTTL = 5,
    enabled = true,
    refetchOnWindowFocus = false
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)
  
  const cacheRef = useRef<SimpleCache<T> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Inicializar cache si se proporciona cacheKey
  if (cacheKey && !cacheRef.current) {
    cacheRef.current = new SimpleCache<T>(cacheTTL)
  }

  const executeQuery = useCallback(async () => {
    if (!enabled) return

    // Cancelar consulta anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Verificar cache
    if (cacheKey && cacheRef.current) {
      const cachedData = cacheRef.current.get(cacheKey)
      if (cachedData) {
        setData(cachedData)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)
    abortControllerRef.current = new AbortController()

    try {
      const result = await queryFn()
      
      if (result.error) {
        throw new Error(result.error.message || 'Query failed')
      }

      setData(result.data)
      
      // Guardar en cache
      if (cacheKey && cacheRef.current && result.data) {
        cacheRef.current.set(cacheKey, result.data)
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err)
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [queryFn, enabled, cacheKey])

  const refetch = useCallback(async () => {
    // Limpiar cache antes de refetch
    if (cacheKey && cacheRef.current) {
      cacheRef.current.clear()
    }
    await executeQuery()
  }, [executeQuery, cacheKey])

  useEffect(() => {
    executeQuery()

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [executeQuery])

  // Refetch en focus si está habilitado
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refetch()
      }
    }

    document.addEventListener('visibilitychange', handleFocus)
    return () => document.removeEventListener('visibilitychange', handleFocus)
  }, [refetch, refetchOnWindowFocus])

  return { data, loading, error, refetch }
}

/**
 * Hook para consultas paginadas optimizadas
 */
export function usePaginatedQuery<T>(
  queryFn: (page: number, pageSize: number) => Promise<{ data: T[] | null; count: number | null; error: any }>,
  pageSize: number = 20
) {
  const [page, setPage] = useState(1)
  const [allData, setAllData] = useState<T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadPage = useCallback(async (pageNum: number, reset: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      const result = await queryFn(pageNum, pageSize)
      
      if (result.error) {
        throw new Error(result.error.message || 'Query failed')
      }

      const newData = result.data || []
      const count = result.count || 0

      setTotalCount(count)
      
      if (reset) {
        setAllData(newData)
      } else {
        setAllData(prev => [...prev, ...newData])
      }

      setHasMore(newData.length === pageSize && allData.length + newData.length < count)
    } catch (err) {
      if (err instanceof Error) {
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }, [queryFn, pageSize, allData.length])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadPage(nextPage)
    }
  }, [loading, hasMore, page, loadPage])

  const refresh = useCallback(() => {
    setPage(1)
    setAllData([])
    loadPage(1, true)
  }, [loadPage])

  useEffect(() => {
    loadPage(1, true)
  }, [])

  return {
    data: allData,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh
  }
}