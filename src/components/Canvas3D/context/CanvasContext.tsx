import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { Polygon, Body } from '../types'
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

  // Body state
  bodies: Body[]
  setBodies: (bodies: Body[]) => void

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
  controlledBodies?: Body[]
  historyContext?: HistoryContextValue
  pixelsPerMeter?: number
  onPolygonsChange?: (polygons: Polygon[]) => void
  onBodiesChange?: (bodies: Body[]) => void
}

export function CanvasProvider({
  children,
  controlledPolygons,
  controlledBodies,
  historyContext,
  pixelsPerMeter,
  onPolygonsChange,
  onBodiesChange,
}: CanvasProviderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBodies, setInternalBodies] = useState<Body[]>([])
  const [isDraggingPoint, setIsDraggingPoint] = useState(false)

  const isControlled = controlledPolygons !== undefined
  const isBodiesControlled = controlledBodies !== undefined

  // Always render from internal state for smooth drag feedback
  const polygons = internalPolygons
  const bodies = isBodiesControlled ? controlledBodies : internalBodies

  // Sync internal state with controlled props (but not during drag)
  useEffect(() => {
    if (isControlled && !isDraggingPoint) {
      setInternalPolygons(controlledPolygons)
    }
  }, [isControlled, controlledPolygons, isDraggingPoint])

  useEffect(() => {
    if (isBodiesControlled) {
      setInternalBodies(controlledBodies)
    }
  }, [isBodiesControlled, controlledBodies])

  // Sync body points with polygon points when polygons change
  useEffect(() => {
    const currentBodies = isBodiesControlled ? controlledBodies : internalBodies
    if (currentBodies.length === 0) return

    const updatedBodies = currentBodies.map((body) => {
      const polygon = polygons.find((p) => p.id === body.polygonId)
      if (!polygon) return body

      const pointsChanged =
        polygon.points.length !== body.points.length ||
        polygon.points.some(
          (p, i) =>
            !body.points[i] ||
            p.x !== body.points[i].x ||
            p.y !== body.points[i].y ||
            p.z !== body.points[i].z
        )

      if (!pointsChanged) return body

      return {
        ...body,
        points: polygon.points.map((p) => p.clone()),
      }
    })

    const hasChanges = updatedBodies.some((b, i) => b !== currentBodies[i])
    if (hasChanges) {
      if (isBodiesControlled) {
        onBodiesChange?.(updatedBodies)
      } else {
        setInternalBodies(updatedBodies)
      }
    }
  }, [polygons, internalBodies, controlledBodies, isBodiesControlled, onBodiesChange])

  const setPolygons = useCallback(
    (newPolygons: Polygon[]) => {
      if (!isControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [isControlled, onPolygonsChange]
  )

  const setBodies = useCallback(
    (newBodies: Body[]) => {
      if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [isBodiesControlled, onBodiesChange]
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
    bodies,
    setBodies,
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
    bodies,
    setBodies,
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
