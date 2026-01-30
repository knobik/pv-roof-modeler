import { useCallback, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolName } from '../types'
import type { ToolActions, ToolHookReturn, ToolState } from './types'
import { useSelectTool, type SelectToolExtended } from './SelectTool/useSelectTool'
import { usePolygonTool, type PolygonToolExtended } from './PolygonTool/usePolygonTool'
import { useLineTool } from './LineTool/useLineTool'
import { useBodyTool, type BodyToolExtended } from './BodyTool/useBodyTool'
import { useCalibrationTool, type CalibrationToolExtended } from './CalibrationTool/useCalibrationTool'
import { useMeasurementTool, type MeasurementToolExtended } from './MeasurementTool/useMeasurementTool'
import { useToolContext } from '../context/ToolContext'
import { useCanvasContext } from '../context/CanvasContext'

export type { PolygonToolExtended } from './PolygonTool/usePolygonTool'
export type { BodyToolExtended } from './BodyTool/useBodyTool'
export type { CalibrationToolExtended } from './CalibrationTool/useCalibrationTool'
export type { MeasurementToolExtended } from './MeasurementTool/useMeasurementTool'
export type { SelectToolExtended } from './SelectTool/useSelectTool'

export interface ToolManagerHandlers extends ToolActions {
  onPointDelete: (polygonId: string, pointIndex: number) => void
}

export interface ToolManagerReturn {
  // Current tool state
  activeTool: ToolName
  statusText: string | null

  // Aggregated event handlers (route to active tool)
  handlers: ToolManagerHandlers

  // Tool switching
  setActiveTool: (tool: ToolName) => void

  // Computed flags
  isDrawing: boolean
  orbitEnabled: boolean

  // Tool-specific data exposed for Scene
  currentPoints: THREE.Vector3[]
  currentColor: string
  calibrationPoints: THREE.Vector3[]
  measurementPoints: THREE.Vector3[]
  selectedLinePoints: { polygonId: string; pointIndex: number } | null

  // Individual tool instances for direct access
  selectTool: SelectToolExtended
  polygonTool: PolygonToolExtended
  lineTool: ToolHookReturn
  bodyTool: BodyToolExtended
  calibrationTool: CalibrationToolExtended
  measurementTool: MeasurementToolExtended
}

export function useToolManager(): ToolManagerReturn {
  const toolContext = useToolContext()
  const canvasContext = useCanvasContext()

  const {
    activeTool,
    setActiveTool: setActiveToolRaw,
    currentPoints,
    calibrationPoints,
    measurementPoints,
    selectedLinePoints,
  } = toolContext

  const { isDraggingPoint } = canvasContext

  // Initialize all tool hooks - they now use context internally
  const selectTool = useSelectTool()
  const polygonTool = usePolygonTool()
  const lineTool = useLineTool()
  const bodyTool = useBodyTool()
  const calibrationTool = useCalibrationTool()
  const measurementTool = useMeasurementTool()

  // Tool lookup by name
  const tools = useMemo(() => ({
    select: selectTool,
    polygon: polygonTool,
    line: lineTool,
    body: bodyTool,
    calibration: calibrationTool,
    measurement: measurementTool,
  }), [selectTool, polygonTool, lineTool, bodyTool, calibrationTool, measurementTool])

  const getToolByName = useCallback((name: ToolName): ToolHookReturn<ToolState> => {
    return tools[name]
  }, [tools])

  const currentTool = tools[activeTool]

  // Handle tool switching with lifecycle
  const setActiveTool = useCallback((newTool: ToolName) => {
    if (newTool === activeTool) return

    // Deactivate old tool
    const oldTool = getToolByName(activeTool)
    oldTool.actions.onDeactivate?.()

    // Switch tool
    setActiveToolRaw(newTool)

    // Activate new tool
    const nextTool = getToolByName(newTool)
    nextTool.actions.onActivate?.()
  }, [activeTool, getToolByName, setActiveToolRaw])

  // Create handlers that route to the appropriate tool
  const handlers = useMemo((): ToolManagerHandlers => ({
    // Lifecycle - always route to current tool
    onActivate: () => currentTool.actions.onActivate?.(),
    onDeactivate: () => currentTool.actions.onDeactivate?.(),

    // Plane click - polygon, calibration, and measurement tools
    onPlaneClick: (point: THREE.Vector3) => {
      if (activeTool === 'polygon') {
        polygonTool.actions.onPlaneClick?.(point)
      } else if (activeTool === 'calibration') {
        calibrationTool.actions.onPlaneClick?.(point)
      } else if (activeTool === 'measurement') {
        measurementTool.actions.onPlaneClick?.(point)
      }
    },

    // Point click - line tool
    onPointClick: (polygonId: string, pointIndex: number) => {
      if (activeTool === 'line') {
        lineTool.actions.onPointClick?.(polygonId, pointIndex)
      }
    },

    // Edge click - select tool only
    onEdgeClick: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => {
      if (activeTool === 'select') {
        selectTool.actions.onEdgeClick?.(polygonId, edgeIndex, position)
      }
    },

    // Polygon click - body tool
    onPolygonClick: (polygonId: string) => {
      if (activeTool === 'body') {
        bodyTool.actions.onPolygonClick?.(polygonId)
      }
    },

    // Body click - body tool (for deletion)
    onBodyClick: (bodyId: string) => {
      if (activeTool === 'body') {
        bodyTool.actions.onBodyClick?.(bodyId)
      }
    },

    // Drag handlers - select tool only
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

    // Point delete - always available via select tool
    onPointDelete: (polygonId: string, pointIndex: number) => {
      selectTool.onPointDelete(polygonId, pointIndex)
    },

    // Cancel - route to current tool then switch to select
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
    calibrationTool,
    measurementTool,
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
  const isDrawing = activeTool === 'polygon' || activeTool === 'calibration' || activeTool === 'measurement'
  const orbitEnabled = activeTool === 'select' && !isDraggingPoint

  // Get current color from polygon tool state (now properly typed)
  const currentColor = polygonTool.state.currentColor

  return {
    activeTool,
    statusText: currentTool.render.statusText,
    handlers,
    setActiveTool,
    isDrawing,
    orbitEnabled,
    currentPoints,
    currentColor,
    calibrationPoints,
    measurementPoints,
    selectedLinePoints,
    selectTool,
    polygonTool,
    lineTool,
    bodyTool,
    calibrationTool,
    measurementTool,
  }
}
