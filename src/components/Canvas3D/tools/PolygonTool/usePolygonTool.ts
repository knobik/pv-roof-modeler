import { useCallback } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn, PolygonToolState } from '../types'
import type { Polygon } from '../../types'
import { useCanvasContext } from '../../context/CanvasContext'
import { useToolContext } from '../../context/ToolContext'
import { COLORS } from '../../constants'

export interface PolygonToolExtended extends ToolHookReturn<PolygonToolState> {
  handleFinishPolygon: () => void
  handleUndoPoint: () => void
}

export function usePolygonTool(): PolygonToolExtended {
  const { polygons, setPolygons, historyContext } = useCanvasContext()
  const { currentPoints, setCurrentPoints, setActiveTool } = useToolContext()

  // Calculate current color based on polygon count
  const currentColor = COLORS[polygons.length % COLORS.length]

  const onPlaneClick = useCallback((point: THREE.Vector3) => {
    setCurrentPoints((prev) => [...prev, point])
  }, [setCurrentPoints])

  const onCancel = useCallback(() => {
    setCurrentPoints([])
    setActiveTool('select')
  }, [setCurrentPoints, setActiveTool])

  const onDeactivate = useCallback(() => {
    setCurrentPoints([])
  }, [setCurrentPoints])

  const handleFinishPolygon = useCallback(() => {
    if (currentPoints.length >= 3) {
      historyContext?.takeSnapshot()
      const newPolygon: Polygon = {
        id: crypto.randomUUID(),
        points: currentPoints,
        color: currentColor,
        lines: [],
      }
      setPolygons([...polygons, newPolygon])
    }
    setCurrentPoints([])
    setActiveTool('select')
  }, [currentPoints, currentColor, polygons, setPolygons, setCurrentPoints, setActiveTool, historyContext])

  const handleUndoPoint = useCallback(() => {
    setCurrentPoints((prev) => prev.slice(0, -1))
  }, [setCurrentPoints])

  const getStatusText = () => {
    if (currentPoints.length === 0) {
      return 'Click to place points'
    }
    return `${currentPoints.length} points${currentPoints.length >= 3 ? ' • Click first point to close' : ''}`
  }

  return {
    state: {
      currentPoints,
      currentColor,
      canFinish: currentPoints.length >= 3,
      canUndo: currentPoints.length > 0,
    },
    actions: {
      onPlaneClick,
      onCancel,
      onDeactivate,
    },
    render: {
      statusText: getStatusText(),
    },
    handleFinishPolygon,
    handleUndoPoint,
  }
}

