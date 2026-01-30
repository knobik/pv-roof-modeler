import { useCallback, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolName } from '../types'
import type { ToolActions, ToolHookReturn } from './types'
import { useSelectTool, type SelectToolExtended } from './SelectTool/useSelectTool'
import { usePolygonTool, type PolygonToolExtended } from './PolygonTool/usePolygonTool'
import { useLineTool } from './LineTool/useLineTool'
import { useBodyTool, type BodyToolExtended } from './BodyTool/useBodyTool'
import { useMeasureTool, type MeasureToolExtended } from './MeasureTool/useMeasureTool'
import { useToolContext } from '../context/ToolContext'
import { useCanvasContext } from '../context/CanvasContext'

export type { PolygonToolExtended } from './PolygonTool/usePolygonTool'
export type { BodyToolExtended } from './BodyTool/useBodyTool'
export type { MeasureToolExtended } from './MeasureTool/useMeasureTool'
export type { SelectToolExtended } from './SelectTool/useSelectTool'

export interface ToolManagerReturn {
  // Current tool state
  activeTool: ToolName
  statusText: string | null

  // Aggregated event handlers (route to active tool)
  handlers: ToolActions & {
    onPointDelete?: (polygonId: string, pointIndex: number) => void
  }

  // Tool switching
  setActiveTool: (tool: ToolName) => void

  // Computed flags
  isDrawing: boolean
  orbitEnabled: boolean

  // Tool-specific data exposed for Scene
  currentPoints: THREE.Vector3[]
  currentColor: string
  measurePoints: THREE.Vector3[]
  selectedLinePoints: { polygonId: string; pointIndex: number } | null

  // Individual tool instances for direct access
  selectTool: SelectToolExtended
  polygonTool: PolygonToolExtended
  lineTool: ToolHookReturn
  bodyTool: BodyToolExtended
  measureTool: MeasureToolExtended
}

export function useToolManager(): ToolManagerReturn {
  const toolContext = useToolContext()
  const canvasContext = useCanvasContext()

  const {
    activeTool,
    setActiveTool: setActiveToolRaw,
    currentPoints,
    measurePoints,
    selectedLinePoints,
  } = toolContext

  const { isDraggingPoint } = canvasContext

  // Initialize all tool hooks - they now use context internally
  const selectTool = useSelectTool()
  const polygonTool = usePolygonTool()
  const lineTool = useLineTool()
  const bodyTool = useBodyTool()
  const measureTool = useMeasureTool()

  // Helper to get tool by name - avoids recreating object each render
  const getToolByName = useCallback((name: ToolName): ToolHookReturn => {
    switch (name) {
      case 'select': return selectTool
      case 'polygon': return polygonTool
      case 'line': return lineTool
      case 'body': return bodyTool
      case 'measure': return measureTool
    }
  }, [selectTool, polygonTool, lineTool, bodyTool, measureTool])

  const currentTool = getToolByName(activeTool)

  // Handle tool switching with lifecycle
  const setActiveTool = useCallback((newTool: ToolName) => {
    if (newTool === activeTool) return

    // Capture current tool before switching
    const oldTool = getToolByName(activeTool)
    oldTool.actions.onDeactivate?.()

    // Switch tool
    setActiveToolRaw(newTool)

    // Activate new tool
    const nextTool = getToolByName(newTool)
    nextTool.actions.onActivate?.()
  }, [activeTool, getToolByName, setActiveToolRaw])

  // Aggregate handlers that route to active tool
  const handlers = useMemo(() => ({
    // Lifecycle
    onActivate: () => currentTool.actions.onActivate?.(),
    onDeactivate: () => currentTool.actions.onDeactivate?.(),

    // Route plane clicks based on active tool
    onPlaneClick: (point: THREE.Vector3) => {
      if (activeTool === 'polygon') {
        polygonTool.actions.onPlaneClick?.(point)
      } else if (activeTool === 'measure') {
        measureTool.actions.onPlaneClick?.(point)
      }
    },

    // Route point clicks based on active tool
    onPointClick: (polygonId: string, pointIndex: number) => {
      if (activeTool === 'line') {
        lineTool.actions.onPointClick?.(polygonId, pointIndex)
      }
    },

    // Edge clicks - only select tool handles this
    onEdgeClick: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => {
      if (activeTool === 'select') {
        selectTool.actions.onEdgeClick?.(polygonId, edgeIndex, position)
      }
    },

    // Polygon clicks for body tool
    onPolygonClick: (polygonId: string) => {
      if (activeTool === 'body') {
        bodyTool.actions.onPolygonClick?.(polygonId)
      }
    },

    // Body clicks for body tool (delete via right-click)
    onBodyClick: (bodyId: string) => {
      if (activeTool === 'body') {
        bodyTool.actions.onBodyClick?.(bodyId)
      }
    },

    // Drag handlers - only select tool handles this
    onPointDragStart: () => {
      if (activeTool === 'select') {
        selectTool.actions.onPointDragStart?.()
      }
    },
    onPointDrag: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => {
      if (activeTool === 'select') {
        selectTool.actions.onPointDrag?.(polygonId, pointIndex, newPosition)
      }
    },
    onPointDragEnd: () => {
      if (activeTool === 'select') {
        selectTool.actions.onPointDragEnd?.()
      }
    },

    // Point delete - select tool handles this
    onPointDelete: (polygonId: string, pointIndex: number) => {
      selectTool.onPointDelete(polygonId, pointIndex)
    },

    // Cancel handler
    onCancel: () => {
      currentTool.actions.onCancel?.()
      if (activeTool !== 'select') {
        setActiveTool('select')
      }
    },
  }), [
    currentTool,
    activeTool,
    selectTool,
    polygonTool,
    lineTool,
    bodyTool,
    measureTool,
    setActiveTool,
  ])

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlers.onCancel?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])

  // Computed flags
  const isDrawing = activeTool === 'polygon' || activeTool === 'measure'
  const orbitEnabled = activeTool === 'select' && !isDraggingPoint

  // Get current color from polygon tool
  const currentColor = polygonTool.state.currentColor as string

  return {
    activeTool,
    statusText: currentTool.render.statusText,
    handlers,
    setActiveTool,
    isDrawing,
    orbitEnabled,
    currentPoints,
    currentColor,
    measurePoints,
    selectedLinePoints,
    selectTool,
    polygonTool,
    lineTool,
    bodyTool,
    measureTool,
  }
}
