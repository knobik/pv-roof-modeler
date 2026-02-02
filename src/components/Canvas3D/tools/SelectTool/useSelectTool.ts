import { useCallback } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn, SelectToolState } from '../types'
import { useCanvasContext } from '../../context/CanvasContext'
import { applyAllPerpendicularConstraints } from '../PerpendicularTool/geometry'

export interface SelectToolExtended extends ToolHookReturn<SelectToolState> {
  onPointDelete: (polygonId: string, pointIndex: number) => void
}

export function useSelectTool(): SelectToolExtended {
  const {
    polygons,
    setPolygons,
    setInternalPolygons,
    commitPolygons,
    historyContext,
    isDraggingPoint,
    setIsDraggingPoint,
  } = useCanvasContext()

  const onActivate = useCallback(() => {
    // Select tool is default - just enables orbit controls
  }, [])

  // Point drag handlers
  const onPointDragStart = useCallback(() => {
    setIsDraggingPoint(true)
    historyContext?.beginBatch()
  }, [setIsDraggingPoint, historyContext])

  const onPointDrag = useCallback(
    (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => {
      setInternalPolygons((prev) =>
        prev.map((p) => {
          if (p.id !== polygonId) return p

          const locks = p.perpendicularLocks ?? []

          // Start with the new position for the dragged point
          let points = p.points.map((pt, i) => (i === pointIndex ? newPosition : pt.clone()))

          // If there are any locks, apply all constraints iteratively
          // The dragged point is fixed so it won't be moved by constraints
          if (locks.length > 0) {
            points = applyAllPerpendicularConstraints(points, locks, [pointIndex])
          }

          return { ...p, points }
        })
      )
    },
    [setInternalPolygons]
  )

  const onPointDragEnd = useCallback(() => {
    setIsDraggingPoint(false)
    historyContext?.endBatch()
    // Propagate the internal state to external (uses callback to avoid stale closure)
    commitPolygons()
  }, [setIsDraggingPoint, historyContext, commitPolygons])

  // Point delete handler
  const onPointDelete = useCallback(
    (polygonId: string, pointIndex: number) => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon || polygon.points.length <= 3) return

      historyContext?.takeSnapshot()
      const newPolygons = polygons.map((p) => {
        if (p.id !== polygonId) return p
        const newPoints = [...p.points]
        newPoints.splice(pointIndex, 1)
        const newLines = (p.lines || [])
          .filter(([a, b]) => a !== pointIndex && b !== pointIndex)
          .map(([a, b]) => [
            a > pointIndex ? a - 1 : a,
            b > pointIndex ? b - 1 : b,
          ] as [number, number])

        // Update perpendicular locks: remove the deleted index and adjust higher indices
        const newLocks = (p.perpendicularLocks ?? [])
          .filter((idx) => idx !== pointIndex)
          .map((idx) => (idx > pointIndex ? idx - 1 : idx))

        return {
          ...p,
          points: newPoints,
          lines: newLines,
          perpendicularLocks: newLocks.length > 0 ? newLocks : undefined,
        }
      })
      setPolygons(newPolygons)
    },
    [polygons, setPolygons, historyContext]
  )

  // Add point on edge handler
  const onEdgeClick = useCallback(
    (polygonId: string, edgeIndex: number, position: THREE.Vector3) => {
      historyContext?.takeSnapshot()
      const newPolygons = polygons.map((p) => {
        if (p.id !== polygonId) return p
        const newPoints = [...p.points]
        newPoints.splice(edgeIndex + 1, 0, position)
        const newLines = (p.lines || []).map(([a, b]) => [
          a > edgeIndex ? a + 1 : a,
          b > edgeIndex ? b + 1 : b,
        ] as [number, number])

        // Update perpendicular locks: adjust indices greater than edgeIndex
        const newLocks = (p.perpendicularLocks ?? []).map((idx) =>
          idx > edgeIndex ? idx + 1 : idx
        )

        return {
          ...p,
          points: newPoints,
          lines: newLines,
          perpendicularLocks: newLocks.length > 0 ? newLocks : undefined,
        }
      })
      setPolygons(newPolygons)
    },
    [polygons, setPolygons, historyContext]
  )

  return {
    state: {
      isDraggingPoint,
    },
    actions: {
      onActivate,
      onPointDragStart,
      onPointDrag,
      onPointDragEnd,
      onEdgeClick,
    },
    render: {
      statusText: null,
    },
    // Extended action for external use
    onPointDelete,
  }
}
