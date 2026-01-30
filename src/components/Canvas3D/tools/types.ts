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

export interface ToolState {
  // Tool-specific state exposed for rendering
  [key: string]: unknown
}

export interface ToolRender {
  statusText: string | null
}

export interface ToolHookReturn {
  state: ToolState
  actions: ToolActions
  render: ToolRender
}
