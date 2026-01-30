import { useCallback } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn, SelectToolState } from '../types'
import { useCanvasContext } from '../../context/CanvasContext'

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
          const newPoints = [...p.points]
          newPoints[pointIndex] = newPosition
          return { ...p, points: newPoints }
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
        return { ...p, points: newPoints, lines: newLines }
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
        return { ...p, points: newPoints, lines: newLines }
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
