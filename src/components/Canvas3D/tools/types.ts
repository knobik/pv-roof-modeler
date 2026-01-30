import * as THREE from 'three'

export interface ToolActions {
  // Lifecycle
  onActivate?: () => void
  onDeactivate?: () => void

  // Input events
  onPlaneClick?: (point: THREE.Vector3) => void
  onPointClick?: (polygonId: string, pointIndex: number) => void
  onEdgeClick?: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void
  onPolygonClick?: (polygonId: string) => void
  onBodyClick?: (bodyId: string) => void

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

export interface LineToolState {
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
}

export interface BodyToolState {
  // Body tool has no exposed state
}

export interface MeasureToolState {
  measurePoints: THREE.Vector3[]
  knownLength: number
  calculatedPixelsPerMeter: number | null
  copyFeedback: boolean
  showPanel: boolean
}

// Union of all tool states for generic use
export type ToolState =
  | SelectToolState
  | PolygonToolState
  | LineToolState
  | BodyToolState
  | MeasureToolState

export interface ToolRender {
  statusText: string | null
}

export interface ToolHookReturn<TState = ToolState> {
  state: TState
  actions: ToolActions
  render: ToolRender
}
