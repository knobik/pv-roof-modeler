import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'
import { analyzePolygon, calculateRoofHeight } from '../utils/polygonAnalysis'

// Tented (pyramidal) roof: all polygon edges connect to a central peak
// Works for any polygon shape - rotation doesn't affect this roof type
export function createTentedRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight, roofPitch } = params
  const analysis = analyzePolygon(points)

  // Use the smaller dimension for roof height calculation
  const minDimension = Math.min(analysis.width, analysis.length)
  const roofHeight = calculateRoofHeight(minDimension, roofPitch)

  // Peak is at centroid
  const peakX = analysis.centroid.x
  const peakY = wallHeight + roofHeight
  const peakZ = analysis.centroid.z

  // Create triangular faces from each polygon edge to the peak
  const vertices: number[] = []
  const indices: number[] = []

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const baseIndex = i * 3

    // Triangle: p1 -> p2 -> peak
    vertices.push(
      p1.x, wallHeight, p1.z,
      p2.x, wallHeight, p2.z,
      peakX, peakY, peakZ
    )

    indices.push(baseIndex, baseIndex + 1, baseIndex + 2)
  }

  const roofGeometry = new THREE.BufferGeometry()
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  roofGeometry.setIndex(indices)
  roofGeometry.computeVertexNormals()

  return {
    roofMesh: roofGeometry,
  }
}
