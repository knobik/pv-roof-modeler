import { useCallback, useState } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn, PerpendicularToolState } from '../types'
import { useCanvasContext } from '../../context/CanvasContext'
import { makePerpendicularAtVertex } from './geometry'

export interface PerpendicularToolExtended extends ToolHookReturn<PerpendicularToolState> {
  applyConstraint: () => void
}

export function usePerpendicularTool(): PerpendicularToolExtended {
  const { polygons, setPolygons, historyContext } = useCanvasContext()

  const [selectedVertexInfo, setSelectedVertexInfo] = useState<{
    polygonId: string
    pointIndex: number
  } | null>(null)
  const [previewPoints, setPreviewPoints] = useState<THREE.Vector3[] | null>(null)

  const onPointClick = useCallback(
    (polygonId: string, pointIndex: number) => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon || polygon.points.length < 3) return

      // Get adjacent points
      const points = polygon.points
      const prevIdx = (pointIndex - 1 + points.length) % points.length
      const nextIdx = (pointIndex + 1) % points.length

      const prev = points[prevIdx]
      const vertex = points[pointIndex]
      const next = points[nextIdx]

      // Calculate preview of perpendicular adjustment
      const newNext = makePerpendicularAtVertex(prev, vertex, next)

      // Create preview points array (clone all, replace nextIdx)
      const preview = points.map((p, i) => (i === nextIdx ? newNext : p.clone()))

      setSelectedVertexInfo({ polygonId, pointIndex })
      setPreviewPoints(preview)
    },
    [polygons]
  )

  const applyConstraint = useCallback(() => {
    if (!selectedVertexInfo || !previewPoints) return

    const { polygonId } = selectedVertexInfo

    historyContext?.takeSnapshot()

    setPolygons(
      polygons.map((p) => {
        if (p.id !== polygonId) return p
        return { ...p, points: previewPoints }
      })
    )

    // Reset state
    setSelectedVertexInfo(null)
    setPreviewPoints(null)
  }, [selectedVertexInfo, previewPoints, polygons, setPolygons, historyContext])

  const onCancel = useCallback(() => {
    setSelectedVertexInfo(null)
    setPreviewPoints(null)
  }, [])

  const onDeactivate = useCallback(() => {
    setSelectedVertexInfo(null)
    setPreviewPoints(null)
  }, [])

  const getStatusText = () => {
    if (!selectedVertexInfo) {
      return 'Click a vertex to make its corner perpendicular'
    }
    return 'Press Enter to apply, Escape to cancel'
  }

  return {
    state: {
      selectedVertexInfo,
      previewPoints,
    },
    actions: {
      onPointClick,
      onCancel,
      onDeactivate,
    },
    render: {
      statusText: getStatusText(),
    },
    applyConstraint,
  }
}
