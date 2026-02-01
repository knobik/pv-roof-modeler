import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { Polygon, Building } from '../types'
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

  // Building state
  buildings: Building[]
  setBuildings: (buildings: Building[]) => void

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
  controlledBuildings?: Building[]
  historyContext?: HistoryContextValue
  pixelsPerMeter?: number
  onPolygonsChange?: (polygons: Polygon[]) => void
  onBuildingsChange?: (buildings: Building[]) => void
}

export function CanvasProvider({
  children,
  controlledPolygons,
  controlledBuildings,
  historyContext,
  pixelsPerMeter,
  onPolygonsChange,
  onBuildingsChange,
}: CanvasProviderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBuildings, setInternalBuildings] = useState<Building[]>([])
  const [isDraggingPoint, setIsDraggingPoint] = useState(false)

  const isControlled = controlledPolygons !== undefined
  const isBuildingsControlled = controlledBuildings !== undefined

  // Always render from internal state for smooth drag feedback
  const polygons = internalPolygons
  const buildings = isBuildingsControlled ? controlledBuildings : internalBuildings

  // Sync internal state with controlled props (but not during drag)
  useEffect(() => {
    if (isControlled && !isDraggingPoint) {
      setInternalPolygons(controlledPolygons)
    }
  }, [isControlled, controlledPolygons, isDraggingPoint])

  useEffect(() => {
    if (isBuildingsControlled) {
      setInternalBuildings(controlledBuildings)
    }
  }, [isBuildingsControlled, controlledBuildings])

  // Sync building points with polygon points when polygons change
  useEffect(() => {
    const currentBuildings = isBuildingsControlled ? controlledBuildings : internalBuildings
    if (currentBuildings.length === 0) return

    const updatedBuildings = currentBuildings.map((building) => {
      const polygon = polygons.find((p) => p.id === building.polygonId)
      if (!polygon) return building

      const pointsChanged =
        polygon.points.length !== building.points.length ||
        polygon.points.some(
          (p, i) =>
            !building.points[i] ||
            p.x !== building.points[i].x ||
            p.y !== building.points[i].y ||
            p.z !== building.points[i].z
        )

      if (!pointsChanged) return building

      return {
        ...building,
        points: polygon.points.map((p) => p.clone()),
      }
    })

    const hasChanges = updatedBuildings.some((b, i) => b !== currentBuildings[i])
    if (hasChanges) {
      if (isBuildingsControlled) {
        onBuildingsChange?.(updatedBuildings)
      } else {
        setInternalBuildings(updatedBuildings)
      }
    }
  }, [polygons, internalBuildings, controlledBuildings, isBuildingsControlled, onBuildingsChange])

  const setPolygons = useCallback(
    (newPolygons: Polygon[]) => {
      if (!isControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [isControlled, onPolygonsChange]
  )

  const setBuildings = useCallback(
    (newBuildings: Building[]) => {
      if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)
    },
    [isBuildingsControlled, onBuildingsChange]
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
    buildings,
    setBuildings,
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
    buildings,
    setBuildings,
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
