import * as THREE from 'three'

export interface Polygon {
  id: string
  points: THREE.Vector3[]
  color: string
  lines: [number, number][]  // pairs of point indices that form internal lines
  visible?: boolean  // whether the polygon is visible in the editor (default: true)
}

// Roof type union - 7 supported roof types
export type RoofType =
  | 'flat' // Horizontal plane (default)
  | 'pitched' // Single slope direction
  | 'tented' // 4 triangular faces meeting at center apex (pyramidal)
  | 'hipped' // 4 sloped sides with horizontal ridge
  | 'half-hip' // Gabled with clipped/sloped ends
  | 'gabled' // 2 sloping sides with vertical gable ends
  | 'mansard' // 4 sides, each with 2 slopes (French style)

export interface Building {
  id: string
  polygonId: string // reference to source polygon
  points: THREE.Vector3[] // base points (from polygon)
  height: number
  color: string
  visible?: boolean // whether the building is visible in the editor (default: true)
  roofType?: RoofType // roof geometry type (default: 'flat')
  roofPitch?: number // roof angle in degrees (default: 30)
  roofRotation?: number // roof rotation in degrees (default: 0)
}

export type ToolName = 'select' | 'polygon' | 'line' | 'building' | 'calibration' | 'measurement'
