import * as THREE from 'three'
import { OUTLINE_HEIGHT } from '../../constants'

/**
 * Calculate the angle at a vertex between two edges (in degrees)
 */
export function calculateAngleAtVertex(
  prev: THREE.Vector3,
  vertex: THREE.Vector3,
  next: THREE.Vector3
): number {
  const v1 = new THREE.Vector2(prev.x - vertex.x, prev.z - vertex.z)
  const v2 = new THREE.Vector2(next.x - vertex.x, next.z - vertex.z)

  // Calculate the angle between the two vectors
  const dot = v1.x * v2.x + v1.y * v2.y
  const len1 = v1.length()
  const len2 = v2.length()

  if (len1 === 0 || len2 === 0) return 0

  const cos = Math.max(-1, Math.min(1, dot / (len1 * len2)))
  const angle = Math.acos(cos)

  return angle * (180 / Math.PI)
}

/**
 * Make the angle at vertex perpendicular by moving the next point.
 * Keeps the edge from prev to vertex fixed, adjusts the position of next
 * to create a 90-degree angle at vertex.
 */
export function makePerpendicularAtVertex(
  prev: THREE.Vector3,
  vertex: THREE.Vector3,
  next: THREE.Vector3
): THREE.Vector3 {
  // Direction from vertex to prev (in XZ plane)
  const toPrev = new THREE.Vector2(
    prev.x - vertex.x,
    prev.z - vertex.z
  )

  // If the edge has no length, can't determine perpendicular
  if (toPrev.length() === 0) {
    return next.clone()
  }

  // Perpendicular direction (rotate 90 degrees CCW in XZ plane)
  const perpDir = new THREE.Vector2(-toPrev.y, toPrev.x).normalize()

  // Project next point onto perpendicular line through vertex
  const toNext = new THREE.Vector2(
    next.x - vertex.x,
    next.z - vertex.z
  )
  const distance = toNext.dot(perpDir)

  // If projection is too small, use a minimum distance to avoid collapsing
  const finalDistance = Math.abs(distance) < 0.01 ? Math.sign(distance) * 0.1 || 0.1 : distance

  return new THREE.Vector3(
    vertex.x + perpDir.x * finalDistance,
    OUTLINE_HEIGHT,
    vertex.z + perpDir.y * finalDistance
  )
}

/**
 * Check if an angle is approximately 90 degrees (within tolerance)
 */
export function isApproximatelyPerpendicular(
  prev: THREE.Vector3,
  vertex: THREE.Vector3,
  next: THREE.Vector3,
  toleranceDegrees: number = 1
): boolean {
  const angle = calculateAngleAtVertex(prev, vertex, next)
  return Math.abs(angle - 90) < toleranceDegrees
}
