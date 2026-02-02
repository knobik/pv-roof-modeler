import * as THREE from 'three'

export interface ToolActions {
  // Lifecycle
  onActivate?: () => void
  onDeactivate?: () => void

  // Input events
  onPlaneClick?: (point: THREE.Vector3) => void
  onPointClick?: (polygonId: string, pointIndex: number) => void
  onEdgeClick?: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void

  // Drag events
  onPointDragStart?: () => void
  onPointDrag?: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => void
  onPointDragEnd?: () => void

  // Keyboard
  onCancel?: () => void
}

// Tool-specific state interfaces
export interface SelectToolState {
  isDraggingPoint: boolean
}

export interface PolygonToolState {
  currentPoints: THREE.Vector3[]
  currentColor: string
  canFinish: boolean
  canUndo: boolean
}

export interface CalibrationToolState {
  calibrationPoints: THREE.Vector3[]
  knownLength: number
  calculatedPixelsPerMeter: number | null
  copyFeedback: boolean
  showPanel: boolean
}

export interface MeasurementToolState {
  measurementPoints: THREE.Vector3[]
  measuredDistance: number | null
  copyFeedback: boolean
  showPanel: boolean
}

export interface PerpendicularToolState {
  // No state needed - locks are stored in polygon data
}

// Union of all tool states for generic use
export type ToolState =
  | SelectToolState
  | PolygonToolState
  | CalibrationToolState
  | MeasurementToolState
  | PerpendicularToolState

export interface ToolRender {
  statusText: string | null
}

export interface ToolHookReturn<TState = ToolState> {
  state: TState
  actions: ToolActions
  render: ToolRender
}
