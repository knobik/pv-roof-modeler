import * as THREE from 'three'

export interface Polygon {
  id: string
  points: THREE.Vector3[]
  color: string
  lines: [number, number][]  // pairs of point indices that form internal lines
  visible?: boolean  // whether the polygon is visible in the editor (default: true)
  perpendicularLocks?: number[]  // indices of vertices locked at 90°
}

export type ToolName = 'select' | 'polygon' | 'calibration' | 'measurement' | 'perpendicular'
