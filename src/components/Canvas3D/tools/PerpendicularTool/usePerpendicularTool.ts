import { useCallback } from 'react'
import type { ToolHookReturn, PerpendicularToolState } from '../types'
import { useCanvasContext } from '../../context/CanvasContext'
import { applyAllPerpendicularConstraints } from './geometry'

export interface PerpendicularToolExtended extends ToolHookReturn<PerpendicularToolState> {
  isVertexLocked: (polygonId: string, pointIndex: number) => boolean
  toggleLock: (polygonId: string, pointIndex: number) => void
}

export function usePerpendicularTool(): PerpendicularToolExtended {
  const { polygons, setPolygons, historyContext } = useCanvasContext()

  const isVertexLocked = useCallback(
    (polygonId: string, pointIndex: number): boolean => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon) return false
      return polygon.perpendicularLocks?.includes(pointIndex) ?? false
    },
    [polygons]
  )

  const toggleLock = useCallback(
    (polygonId: string, pointIndex: number) => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon || polygon.points.length < 3) return

      historyContext?.takeSnapshot()

      setPolygons(
        polygons.map((p) => {
          if (p.id !== polygonId) return p

          const currentLocks = p.perpendicularLocks ?? []
          const isLocked = currentLocks.includes(pointIndex)

          let newLocks: number[]
          let newPoints = p.points

          if (isLocked) {
            // Remove lock
            newLocks = currentLocks.filter((idx) => idx !== pointIndex)
          } else {
            // Add lock
            newLocks = [...currentLocks, pointIndex]

            // Apply all perpendicular constraints iteratively
            newPoints = applyAllPerpendicularConstraints(p.points, newLocks)
          }

          return {
            ...p,
            points: newPoints,
            perpendicularLocks: newLocks.length > 0 ? newLocks : undefined,
          }
        })
      )
    },
    [polygons, setPolygons, historyContext]
  )

  const onPointClick = useCallback(
    (polygonId: string, pointIndex: number) => {
      toggleLock(polygonId, pointIndex)
    },
    [toggleLock]
  )

  const getStatusText = () => {
    return 'Click a vertex to toggle 90° lock'
  }

  return {
    state: {},
    actions: {
      onPointClick,
    },
    render: {
      statusText: getStatusText(),
    },
    isVertexLocked,
    toggleLock,
  }
}
