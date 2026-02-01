import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'
import { analyzePolygon, calculateRoofHeight } from '../utils/polygonAnalysis'
import { MANSARD_LOWER_PITCH, MANSARD_UPPER_PITCH, MANSARD_BREAK_RATIO } from '../../../constants'

// Mansard roof: double-slope roof with steep lower section and gentle upper section
// For arbitrary polygons, creates inset levels following the polygon shape
// Rotation doesn't significantly affect this roof type (converges to peak)
export function createMansardRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight } = params
  const analysis = analyzePolygon(points)

  // Calculate heights using mansard-specific pitches
  const lowerHeight = calculateRoofHeight(analysis.width * 0.3, MANSARD_LOWER_PITCH)
  const upperHeight = calculateRoofHeight(analysis.width * 0.2, MANSARD_UPPER_PITCH)

  const breakY = wallHeight + lowerHeight * MANSARD_BREAK_RATIO
  const peakY = wallHeight + lowerHeight + upperHeight

  // Inset ratio for break point (how much smaller the upper section is)
  const breakInsetRatio = 0.15

  // Calculate inset points for break level
  function insetPoint(point: THREE.Vector3, centroid: THREE.Vector3, ratio: number): THREE.Vector3 {
    return new THREE.Vector3(
      point.x + (centroid.x - point.x) * ratio,
      0, // Y will be set separately
      point.z + (centroid.z - point.z) * ratio
    )
  }

  const centroid = analysis.centroid

  // Create break-level polygon (inset from base)
  const breakPoints = points.map(p => {
    const inset = insetPoint(p, centroid, breakInsetRatio)
    inset.y = breakY
    return inset
  })

  // Create peak point (at centroid for pyramidal top)
  const peakPoint = new THREE.Vector3(centroid.x, peakY, centroid.z)

  const vertices: number[] = []
  const indices: number[] = []
  let vertexIndex = 0

  // Lower section: steep slope from base to break level
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    const b1 = breakPoints[i]
    const b2 = breakPoints[(i + 1) % points.length]

    // Quadrilateral from base edge to break edge
    vertices.push(
      p1.x, wallHeight, p1.z,
      p2.x, wallHeight, p2.z,
      b2.x, b2.y, b2.z,
      b1.x, b1.y, b1.z
    )

    indices.push(
      vertexIndex, vertexIndex + 1, vertexIndex + 2,
      vertexIndex, vertexIndex + 2, vertexIndex + 3
    )
    vertexIndex += 4
  }

  // Upper section: gentle slope from break level to peak
  for (let i = 0; i < breakPoints.length; i++) {
    const b1 = breakPoints[i]
    const b2 = breakPoints[(i + 1) % breakPoints.length]

    // Triangle from break edge to peak
    vertices.push(
      b1.x, b1.y, b1.z,
      b2.x, b2.y, b2.z,
      peakPoint.x, peakPoint.y, peakPoint.z
    )

    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2)
    vertexIndex += 3
  }

  const roofGeometry = new THREE.BufferGeometry()
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  roofGeometry.setIndex(indices)
  roofGeometry.computeVertexNormals()

  return {
    roofMesh: roofGeometry,
  }
}
