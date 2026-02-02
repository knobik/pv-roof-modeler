import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { Polygon } from '../types'
import type { HistoryContextValue } from '../../../hooks/useHistory'
import { PLANE_WIDTH } from '../constants'

export interface CanvasContextValue {
  // Image state
  imageUrl: string | null
  setImageUrl: (url: string | null) => void
  aspectRatio: number
  setAspectRatio: (ratio: number) => void
  imageWidth: number | null
  setImageWidth: (width: number | null) => void

  // Polygon state
  polygons: Polygon[]
  setPolygons: (polygons: Polygon[]) => void
  internalPolygons: Polygon[]
  setInternalPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>
  /** Commits current internal polygons to external state (for drag end) */
  commitPolygons: () => void

  // History
  historyContext?: HistoryContextValue

  // Drag state
  isDraggingPoint: boolean
  setIsDraggingPoint: (dragging: boolean) => void

  // Computed values
  planeWidth: number

  // Measurement
  pixelsPerMeter: number | null
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

export interface CanvasProviderProps {
  children: React.ReactNode
  controlledPolygons?: Polygon[]
  historyContext?: HistoryContextValue
  pixelsPerMeter?: number
  onPolygonsChange?: (polygons: Polygon[]) => void
}

export function CanvasProvider({
  children,
  controlledPolygons,
  historyContext,
  pixelsPerMeter,
  onPolygonsChange,
}: CanvasProviderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [isDraggingPoint, setIsDraggingPoint] = useState(false)

  const isControlled = controlledPolygons !== undefined

  // Always render from internal state for smooth drag feedback
  const polygons = internalPolygons

  // Sync internal state with controlled props (but not during drag)
  useEffect(() => {
    if (isControlled && !isDraggingPoint) {
      setInternalPolygons(controlledPolygons)
    }
  }, [isControlled, controlledPolygons, isDraggingPoint])

  const setPolygons = useCallback(
    (newPolygons: Polygon[]) => {
      if (!isControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [isControlled, onPolygonsChange]
  )

  // Commit current internal polygons to external state (used at drag end to avoid stale closures)
  const commitPolygons = useCallback(() => {
    setInternalPolygons((current) => {
      onPolygonsChange?.(current)
      return current
    })
  }, [onPolygonsChange])

  const value = useMemo<CanvasContextValue>(() => ({
    imageUrl,
    setImageUrl,
    aspectRatio,
    setAspectRatio,
    imageWidth,
    setImageWidth,
    polygons,
    setPolygons,
    internalPolygons,
    setInternalPolygons,
    commitPolygons,
    historyContext,
    isDraggingPoint,
    setIsDraggingPoint,
    planeWidth: PLANE_WIDTH,
    pixelsPerMeter: pixelsPerMeter ?? null,
  }), [
    imageUrl,
    aspectRatio,
    imageWidth,
    polygons,
    setPolygons,
    internalPolygons,
    commitPolygons,
    historyContext,
    isDraggingPoint,
    pixelsPerMeter,
  ])

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvasContext(): CanvasContextValue {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider')
  }
  return context
}

export function useCanvasContextOptional(): CanvasContextValue | null {
  return useContext(CanvasContext)
}
