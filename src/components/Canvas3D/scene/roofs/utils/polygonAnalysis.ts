import * as THREE from 'three'
import type { PolygonAnalysis } from '../types'

export function analyzePolygon(points: THREE.Vector3[], rotationDegrees: number = 0): PolygonAnalysis {
  // Calculate centroid
  const centroid = new THREE.Vector3()
  points.forEach((p) => centroid.add(p))
  centroid.divideScalar(points.length)

  // Calculate axis-aligned bounding box
  const minX = Math.min(...points.map((p) => p.x))
  const maxX = Math.max(...points.map((p) => p.x))
  const minZ = Math.min(...points.map((p) => p.z))
  const maxZ = Math.max(...points.map((p) => p.z))

  const xSpan = maxX - minX
  const zSpan = maxZ - minZ

  // Base ridge direction runs along the longer dimension
  const ridgeDirection = xSpan >= zSpan ? 'x' : 'z'

  // Calculate ridge angle including rotation
  // Base angle: 0 for X-axis ridge, PI/2 for Z-axis ridge
  const baseAngle = ridgeDirection === 'x' ? 0 : Math.PI / 2
  const rotationRadians = (rotationDegrees * Math.PI) / 180
  const ridgeAngle = baseAngle + rotationRadians

  return {
    centroid,
    boundingBox: {
      min: new THREE.Vector2(minX, minZ),
      max: new THREE.Vector2(maxX, maxZ),
    },
    ridgeDirection,
    ridgeAngle,
    width: ridgeDirection === 'x' ? zSpan : xSpan, // Perpendicular to ridge
    length: ridgeDirection === 'x' ? xSpan : zSpan, // Along ridge
  }
}

// Calculate roof peak height based on pitch and width
export function calculateRoofHeight(width: number, pitchDegrees: number): number {
  const pitchRadians = (pitchDegrees * Math.PI) / 180
  return (width / 2) * Math.tan(pitchRadians)
}

// Get the ridge line endpoints at the eave level
export function getRidgeLine(
  analysis: PolygonAnalysis,
  wallHeight: number,
  roofHeight: number
): { start: THREE.Vector3; end: THREE.Vector3 } {
  const { centroid, boundingBox, ridgeDirection } = analysis
  const ridgeY = wallHeight + roofHeight

  if (ridgeDirection === 'x') {
    // Ridge runs along X axis
    return {
      start: new THREE.Vector3(boundingBox.min.x, ridgeY, centroid.z),
      end: new THREE.Vector3(boundingBox.max.x, ridgeY, centroid.z),
    }
  } else {
    // Ridge runs along Z axis
    return {
      start: new THREE.Vector3(centroid.x, ridgeY, boundingBox.min.y),
      end: new THREE.Vector3(centroid.x, ridgeY, boundingBox.max.y),
    }
  }
}

// Project a point onto a ridge line defined by angle through centroid
export function projectToRidgeLine(
  point: THREE.Vector3,
  centroid: THREE.Vector3,
  ridgeAngle: number,
  ridgeY: number
): THREE.Vector3 {
  // Ridge direction vector
  const ridgeDir = new THREE.Vector2(Math.cos(ridgeAngle), Math.sin(ridgeAngle))

  // Vector from centroid to point (in XZ plane)
  const toPoint = new THREE.Vector2(point.x - centroid.x, point.z - centroid.z)

  // Project onto ridge direction
  const projection = toPoint.dot(ridgeDir)

  return new THREE.Vector3(
    centroid.x + ridgeDir.x * projection,
    ridgeY,
    centroid.z + ridgeDir.y * projection
  )
}

// Get which side of the ridge a point is on (-1 or 1)
export function getRidgeSide(
  point: THREE.Vector3,
  centroid: THREE.Vector3,
  ridgeAngle: number
): number {
  // Perpendicular direction (90 degrees from ridge)
  const perpAngle = ridgeAngle + Math.PI / 2
  const perpDir = new THREE.Vector2(Math.cos(perpAngle), Math.sin(perpAngle))

  // Vector from centroid to point
  const toPoint = new THREE.Vector2(point.x - centroid.x, point.z - centroid.z)

  // Dot product gives signed distance
  return toPoint.dot(perpDir) < 0 ? -1 : 1
}
