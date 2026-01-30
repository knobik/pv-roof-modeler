import { useCallback } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn } from '../types'
import type { Polygon } from '../../types'
import type { HistoryContextValue } from '../../../../hooks/useHistory'

export interface UsePolygonToolOptions {
  currentPoints: THREE.Vector3[]
  setCurrentPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>
  currentColor: string
  polygons: Polygon[]
  setPolygons: (polygons: Polygon[]) => void
  setActiveTool: (tool: 'select' | 'polygon' | 'line' | 'body' | 'measure') => void
  historyContext?: HistoryContextValue
}

export function usePolygonTool({
  currentPoints,
  setCurrentPoints,
  currentColor,
  polygons,
  setPolygons,
  setActiveTool,
  historyContext,
}: UsePolygonToolOptions): ToolHookReturn {
  const onPlaneClick = useCallback((point: THREE.Vector3) => {
    setCurrentPoints((prev) => [...prev, point])
  }, [setCurrentPoints])

  const onCancel = useCallback(() => {
    setCurrentPoints([])
    setActiveTool('select')
  }, [setCurrentPoints, setActiveTool])

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
    },
    render: {
      SceneElements: null, // Scene elements are rendered via PolygonOutlines
      UIElements: null, // UI handled separately
      statusText: getStatusText(),
    },
    // Additional actions exposed for UI
    handleFinishPolygon,
    handleUndoPoint,
  } as ToolHookReturn & {
    handleFinishPolygon: () => void
    handleUndoPoint: () => void
  }
}
