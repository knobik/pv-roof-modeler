import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'

export function createFlatRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight } = params

  // Create shape from polygon points
  const shape = new THREE.Shape()
  shape.moveTo(points[0].x, -points[0].z)
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, -points[i].z)
  }
  shape.closePath()

  // Create flat geometry - will be positioned at wallHeight by BuildingBody
  const geometry = new THREE.ShapeGeometry(shape)

  // Transform to XZ plane at correct height
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    // ShapeGeometry creates in XY plane, we need XZ plane
    positions.setXYZ(i, x, wallHeight, -y)
  }
  positions.needsUpdate = true

  // Recalculate normals (pointing up)
  geometry.computeVertexNormals()

  return {
    roofMesh: geometry,
  }
}
