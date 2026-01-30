import * as THREE from 'three'

export interface ToolActions {
  onActivate?: () => void
  onDeactivate?: () => void
  onPlaneClick?: (point: THREE.Vector3) => void
  onPointClick?: (polygonId: string, pointIndex: number) => void
  onPolygonClick?: (polygonId: string) => void
  onCancel?: () => void
}

export interface ToolRender {
  SceneElements: React.FC | null
  UIElements: React.FC | null
  statusText: string | null
}

export interface ToolHookReturn {
  state: Record<string, unknown>
  actions: ToolActions
  render: ToolRender
}
