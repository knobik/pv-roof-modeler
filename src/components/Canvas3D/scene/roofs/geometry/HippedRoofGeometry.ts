import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'
import { analyzePolygon, calculateRoofHeight, projectToRidgeLine } from '../utils/polygonAnalysis'

// Hipped roof: 4 sloped sides, all polygon edges slope inward
// Similar to tented but can have a ridge line for elongated polygons
export function createHippedRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight, roofPitch, roofRotation } = params
  const analysis = analyzePolygon(points, roofRotation)
  const roofHeight = calculateRoofHeight(analysis.width, roofPitch)

  const { centroid, ridgeAngle, width, length } = analysis
  const ridgeY = wallHeight + roofHeight

  // If the polygon is nearly square, use tented (pyramidal) approach
  const aspectRatio = length / width
  if (aspectRatio < 1.3) {
    // Nearly square - use pyramidal roof (all edges to center peak)
    return createPyramidalRoof(points, wallHeight, ridgeY, centroid)
  }

  // For elongated polygons, create a ridge
  const vertices: number[] = []
  const indices: number[] = []

  // Ridge direction vector
  const ridgeDir = new THREE.Vector2(Math.cos(ridgeAngle), Math.sin(ridgeAngle))

  // Calculate ridge line segment (shortened based on inset)
  const ridgeHalfLength = (length - width) / 2
  const ridgeStart = new THREE.Vector3(
    centroid.x - ridgeDir.x * ridgeHalfLength,
    ridgeY,
    centroid.z - ridgeDir.y * ridgeHalfLength
  )
  const ridgeEnd = new THREE.Vector3(
    centroid.x + ridgeDir.x * ridgeHalfLength,
    ridgeY,
    centroid.z + ridgeDir.y * ridgeHalfLength
  )

  // Project vertex to closest point on ridge line segment
  function projectToRidge(point: THREE.Vector3): THREE.Vector3 {
    const fullProjection = projectToRidgeLine(point, centroid, ridgeAngle, ridgeY)

    // Clamp to ridge segment
    const toStart = new THREE.Vector2(
      fullProjection.x - ridgeStart.x,
      fullProjection.z - ridgeStart.z
    )
    const toEnd = new THREE.Vector2(
      ridgeEnd.x - ridgeStart.x,
      ridgeEnd.z - ridgeStart.z
    )

    const ridgeLength = toEnd.length()
    if (ridgeLength < 0.001) {
      // Ridge is a point
      return ridgeStart.clone()
    }

    const t = toStart.dot(toEnd) / (ridgeLength * ridgeLength)
    const clampedT = Math.max(0, Math.min(1, t))

    return new THREE.Vector3(
      ridgeStart.x + toEnd.x * clampedT,
      ridgeY,
      ridgeStart.z + toEnd.y * clampedT
    )
  }

  let vertexIndex = 0

  // Create faces for each polygon edge
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const ridge1 = projectToRidge(p1)
    const ridge2 = projectToRidge(p2)

    // Check if ridge points are the same (hip end) or different (slope)
    const ridgeSame = ridge1.distanceTo(ridge2) < 0.001

    if (ridgeSame) {
      // Hip end - triangle from edge to single ridge point
      vertices.push(
        p1.x, wallHeight, p1.z,
        p2.x, wallHeight, p2.z,
        ridge1.x, ridge1.y, ridge1.z
      )

      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2)
      vertexIndex += 3
    } else {
      // Slope - quadrilateral from edge to ridge segment
      vertices.push(
        p1.x, wallHeight, p1.z,
        p2.x, wallHeight, p2.z,
        ridge2.x, ridge2.y, ridge2.z,
        ridge1.x, ridge1.y, ridge1.z
      )

      indices.push(
        vertexIndex, vertexIndex + 1, vertexIndex + 2,
        vertexIndex, vertexIndex + 2, vertexIndex + 3
      )
      vertexIndex += 4
    }
  }

  const roofGeometry = new THREE.BufferGeometry()
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  roofGeometry.setIndex(indices)
  roofGeometry.computeVertexNormals()

  return {
    roofMesh: roofGeometry,
  }
}

// Helper: pyramidal roof for nearly square polygons
function createPyramidalRoof(
  points: THREE.Vector3[],
  wallHeight: number,
  peakY: number,
  centroid: THREE.Vector3
): RoofGeometryResult {
  const vertices: number[] = []
  const indices: number[] = []

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const baseIndex = i * 3

    vertices.push(
      p1.x, wallHeight, p1.z,
      p2.x, wallHeight, p2.z,
      centroid.x, peakY, centroid.z
    )

    indices.push(baseIndex, baseIndex + 1, baseIndex + 2)
  }

  const roofGeometry = new THREE.BufferGeometry()
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  roofGeometry.setIndex(indices)
  roofGeometry.computeVertexNormals()

  return { roofMesh: roofGeometry }
}
