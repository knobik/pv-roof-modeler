import { useCallback } from 'react'
import type { ToolHookReturn } from '../types'
import type { Polygon } from '../../types'
import type { HistoryContextValue } from '../../../../hooks/useHistory'

export interface UseLineToolOptions {
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  setSelectedLinePoints: (points: { polygonId: string; pointIndex: number } | null) => void
  polygons: Polygon[]
  setPolygons: (polygons: Polygon[]) => void
  historyContext?: HistoryContextValue
}

export function useLineTool({
  selectedLinePoints,
  setSelectedLinePoints,
  polygons,
  setPolygons,
  historyContext,
}: UseLineToolOptions): ToolHookReturn {
  const onPointClick = useCallback(
    (polygonId: string, pointIndex: number) => {
      if (!selectedLinePoints) {
        // First point selected
        setSelectedLinePoints({ polygonId, pointIndex })
      } else if (selectedLinePoints.polygonId === polygonId) {
        // Second point selected in same polygon
        if (selectedLinePoints.pointIndex !== pointIndex) {
          // Check if line already exists
          const polygon = polygons.find((p) => p.id === polygonId)
          if (polygon) {
            const lineExists = polygon.lines?.some(
              ([a, b]) =>
                (a === selectedLinePoints.pointIndex && b === pointIndex) ||
                (a === pointIndex && b === selectedLinePoints.pointIndex)
            )

            // Check if it's an edge (adjacent points)
            const isEdge =
              Math.abs(selectedLinePoints.pointIndex - pointIndex) === 1 ||
              (selectedLinePoints.pointIndex === 0 && pointIndex === polygon.points.length - 1) ||
              (pointIndex === 0 && selectedLinePoints.pointIndex === polygon.points.length - 1)

            if (!lineExists && !isEdge) {
              // Add the line
              historyContext?.takeSnapshot()
              const newPolygons = polygons.map((p) => {
                if (p.id !== polygonId) return p
                const newLines = [...(p.lines || []), [selectedLinePoints.pointIndex, pointIndex] as [number, number]]
                return { ...p, lines: newLines }
              })
              setPolygons(newPolygons)
            }
          }
        }
        setSelectedLinePoints(null)
      } else {
        // Different polygon, reset selection
        setSelectedLinePoints({ polygonId, pointIndex })
      }
    },
    [selectedLinePoints, setSelectedLinePoints, polygons, setPolygons, historyContext]
  )

  const onCancel = useCallback(() => {
    setSelectedLinePoints(null)
  }, [setSelectedLinePoints])

  const getStatusText = () => {
    return selectedLinePoints
      ? 'Click another point to create a line'
      : 'Click on a point to start a line'
  }

  return {
    state: {
      selectedLinePoints,
    },
    actions: {
      onPointClick,
      onCancel,
    },
    render: {
      SceneElements: null,
      UIElements: null,
      statusText: getStatusText(),
    },
  }
}
