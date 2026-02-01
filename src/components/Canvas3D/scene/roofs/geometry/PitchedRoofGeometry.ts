import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'
import { analyzePolygon, calculateRoofHeight } from '../utils/polygonAnalysis'

// Pitched (shed) roof: single slope in one direction
// Rotation controls the slope direction
export function createPitchedRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight, roofPitch, roofRotation } = params
  const analysis = analyzePolygon(points, roofRotation)
  const roofHeight = calculateRoofHeight(analysis.width * 2, roofPitch)

  const { centroid, ridgeAngle } = analysis
  const lowY = wallHeight

  // Slope direction is perpendicular to the ridge angle
  // Points in the positive perpendicular direction are higher
  const slopeAngle = ridgeAngle + Math.PI / 2
  const slopeDir = new THREE.Vector2(Math.cos(slopeAngle), Math.sin(slopeAngle))

  // Find the range of distances along the slope direction
  let minDist = Infinity
  let maxDist = -Infinity
  for (const point of points) {
    const dist = (point.x - centroid.x) * slopeDir.x + (point.z - centroid.z) * slopeDir.y
    minDist = Math.min(minDist, dist)
    maxDist = Math.max(maxDist, dist)
  }
  const distRange = maxDist - minDist

  // Calculate height for each vertex based on position along slope direction
  function getVertexHeight(point: THREE.Vector3): number {
    const dist = (point.x - centroid.x) * slopeDir.x + (point.z - centroid.z) * slopeDir.y
    const t = (dist - minDist) / distRange
    return lowY + t * roofHeight
  }

  // Create a single sloped surface following the polygon shape
  // Use triangulation from centroid
  const vertices: number[] = []
  const indices: number[] = []

  // Calculate roof centroid height
  let centroidHeight = 0
  for (const point of points) {
    centroidHeight += getVertexHeight(point)
  }
  centroidHeight /= points.length

  // Add centroid vertex first
  vertices.push(centroid.x, centroidHeight, centroid.z)

  // Add all polygon vertices at their respective heights
  for (const point of points) {
    const height = getVertexHeight(point)
    vertices.push(point.x, height, point.z)
  }

  // Create triangles from centroid to each edge
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length
    indices.push(0, i + 1, next + 1)
  }

  const roofGeometry = new THREE.BufferGeometry()
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  roofGeometry.setIndex(indices)
  roofGeometry.computeVertexNormals()

  // Create side walls (triangular fills where height changes)
  const gableVertices: number[] = []
  const gableIndices: number[] = []
  let gableVertexIndex = 0

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    const h1 = getVertexHeight(p1)
    const h2 = getVertexHeight(p2)

    // If heights differ significantly, we need a triangular fill
    if (Math.abs(h1 - h2) > 0.001) {
      // Create quadrilateral from wall height to roof height
      gableVertices.push(
        p1.x, wallHeight, p1.z,
        p2.x, wallHeight, p2.z,
        p2.x, h2, p2.z,
        p1.x, h1, p1.z
      )

      gableIndices.push(
        gableVertexIndex, gableVertexIndex + 1, gableVertexIndex + 2,
        gableVertexIndex, gableVertexIndex + 2, gableVertexIndex + 3
      )
      gableVertexIndex += 4
    }
  }

  let gableGeometry: THREE.BufferGeometry | undefined
  if (gableVertices.length > 0) {
    gableGeometry = new THREE.BufferGeometry()
    gableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gableVertices, 3))
    gableGeometry.setIndex(gableIndices)
    gableGeometry.computeVertexNormals()
  }

  return {
    roofMesh: roofGeometry,
    gableMesh: gableGeometry,
  }
}
