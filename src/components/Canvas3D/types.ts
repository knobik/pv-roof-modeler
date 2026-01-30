import * as THREE from 'three'

export interface Polygon {
  id: string
  points: THREE.Vector3[]
  color: string
  lines: [number, number][]  // pairs of point indices that form internal lines
  visible?: boolean  // whether the polygon is visible in the editor (default: true)
}

export interface Body {
  id: string
  polygonId: string  // reference to source polygon
  points: THREE.Vector3[]  // base points (from polygon)
  height: number
  color: string
  visible?: boolean  // whether the body is visible in the editor (default: true)
}

export type ToolName = 'select' | 'polygon' | 'line' | 'body' | 'measure'
