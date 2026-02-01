import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'
import {
  analyzePolygon,
  calculateRoofHeight,
  projectToRidgeLine,
  getRidgeSide,
} from '../utils/polygonAnalysis'

// Gabled roof: two sloped faces meeting at a ridge
// For arbitrary polygons, each edge slopes up to the ridge line
export function createGabledRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight, roofPitch, roofRotation } = params
  const analysis = analyzePolygon(points, roofRotation)
  const roofHeight = calculateRoofHeight(analysis.width, roofPitch)

  const { centroid, ridgeAngle } = analysis
  const ridgeY = wallHeight + roofHeight

  // Project vertex onto the ridge line
  function projectToRidge(point: THREE.Vector3): THREE.Vector3 {
    return projectToRidgeLine(point, centroid, ridgeAngle, ridgeY)
  }

  // Get which side of the ridge a point is on
  function getSide(point: THREE.Vector3): number {
    return getRidgeSide(point, centroid, ridgeAngle)
  }

  const roofVertices: number[] = []
  const roofIndices: number[] = []
  const gableVertices: number[] = []
  const gableIndices: number[] = []

  let roofVertexIndex = 0
  let gableVertexIndex = 0

  // Process each edge
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const side1 = getSide(p1)
    const side2 = getSide(p2)

    const ridge1 = projectToRidge(p1)
    const ridge2 = projectToRidge(p2)

    if (side1 === side2) {
      // Both vertices on same side - this is a slope edge
      // Create quadrilateral from edge to ridge
      roofVertices.push(
        p1.x, wallHeight, p1.z,
        p2.x, wallHeight, p2.z,
        ridge2.x, ridge2.y, ridge2.z,
        ridge1.x, ridge1.y, ridge1.z
      )

      roofIndices.push(
        roofVertexIndex, roofVertexIndex + 1, roofVertexIndex + 2,
        roofVertexIndex, roofVertexIndex + 2, roofVertexIndex + 3
      )
      roofVertexIndex += 4
    } else {
      // Vertices on opposite sides - this is a gable edge
      // Find where the edge crosses the ridge line
      const t = findRidgeCrossing(p1, p2, centroid, ridgeAngle)
      const crossX = p1.x + t * (p2.x - p1.x)
      const crossZ = p1.z + t * (p2.z - p1.z)
      const ridgePoint = new THREE.Vector3(crossX, ridgeY, crossZ)

      // Create gable triangle
      gableVertices.push(
        p1.x, wallHeight, p1.z,
        p2.x, wallHeight, p2.z,
        ridgePoint.x, ridgePoint.y, ridgePoint.z
      )

      gableIndices.push(gableVertexIndex, gableVertexIndex + 1, gableVertexIndex + 2)
      gableVertexIndex += 3
    }
  }

  const roofGeometry = new THREE.BufferGeometry()
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3))
  roofGeometry.setIndex(roofIndices)
  roofGeometry.computeVertexNormals()

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

// Find parameter t where line from p1 to p2 crosses the ridge line
function findRidgeCrossing(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  centroid: THREE.Vector3,
  ridgeAngle: number
): number {
  // Ridge line through centroid with direction (cos(angle), sin(angle))
  // Edge from p1 to p2
  // Find intersection

  const ridgeDir = new THREE.Vector2(Math.cos(ridgeAngle), Math.sin(ridgeAngle))
  const perpDir = new THREE.Vector2(-ridgeDir.y, ridgeDir.x)

  // Distance from p1 to ridge line (signed)
  const d1 = (p1.x - centroid.x) * perpDir.x + (p1.z - centroid.z) * perpDir.y
  // Distance from p2 to ridge line (signed)
  const d2 = (p2.x - centroid.x) * perpDir.x + (p2.z - centroid.z) * perpDir.y

  // Linear interpolation to find crossing point
  if (Math.abs(d2 - d1) < 0.0001) return 0.5
  return d1 / (d1 - d2)
}
