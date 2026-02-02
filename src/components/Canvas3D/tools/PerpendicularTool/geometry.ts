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

/**
 * Apply perpendicular constraints by propagating from fixed points.
 * Walks around the polygon from each fixed point, adjusting vertices as needed.
 *
 * @param points - Array of polygon points
 * @param locks - Array of vertex indices that should be locked at 90°
 * @param fixedIndices - Optional array of point indices that should not be moved
 * @returns New array of adjusted points
 */
export function applyAllPerpendicularConstraints(
  points: THREE.Vector3[],
  locks: number[],
  fixedIndices: number[] = []
): THREE.Vector3[] {
  if (locks.length === 0 || points.length < 3) {
    return points
  }

  const numPoints = points.length
  const currentPoints = points.map(p => p.clone())
  const locksSet = new Set(locks)
  const fixedSet = new Set(fixedIndices)

  if (fixedIndices.length === 0) {
    // No fixed points - just apply constraints starting from first lock
    return applyConstraintsIteratively(currentPoints, locks, new Set(), numPoints)
  }

  const fixedIdx = fixedIndices[0]

  // Go around the polygon starting from fixed point
  // Apply constraints as we encounter locked vertices
  for (let i = 1; i < numPoints; i++) {
    const idx = (fixedIdx + i) % numPoints

    if (locksSet.has(idx)) {
      // This vertex is locked - apply constraint
      const prevIdx = (idx - 1 + numPoints) % numPoints
      const nextIdx = (idx + 1) % numPoints

      // The "incoming" edge is from the direction we came (already processed)
      const incomingVertex = currentPoints[prevIdx]
      const lockedVertex = currentPoints[idx]

      // If the outgoing vertex is the fixed point, we need to handle this specially
      // by adjusting the locked vertex itself (if allowed) to satisfy the constraint
      if (fixedSet.has(nextIdx)) {
        // The next vertex is fixed - we need to position the current locked vertex
        // such that the angle constraint is satisfied
        // Skip for now - this constraint can't be fully satisfied
        continue
      }

      // Check if the vertex AFTER next is the fixed point
      // In that case, we need to place nextIdx such that the constraint at nextIdx (if locked) will also work
      const nextNextIdx = (nextIdx + 1) % numPoints
      if (fixedSet.has(nextNextIdx) && locksSet.has(nextIdx)) {
        // nextIdx is locked and its next neighbor is fixed
        // We need to place nextIdx to satisfy BOTH this constraint and the next one
        // Use the fixed point position to determine the correct placement
        const fixedPoint = currentPoints[nextNextIdx]
        currentPoints[nextIdx] = makePerpendicularAtVertex(incomingVertex, lockedVertex, fixedPoint)
      } else {
        // Normal case: adjust the outgoing vertex
        const outgoingVertex = currentPoints[nextIdx]
        currentPoints[nextIdx] = makePerpendicularAtVertex(incomingVertex, lockedVertex, outgoingVertex)
      }
    }
  }

  return currentPoints
}

/**
 * Fallback iterative solver for when there are no fixed points.
 */
function applyConstraintsIteratively(
  points: THREE.Vector3[],
  locks: number[],
  fixedSet: Set<number>,
  numPoints: number
): THREE.Vector3[] {
  const currentPoints = points.map(p => p.clone())

  for (let iteration = 0; iteration < 10; iteration++) {
    let maxChange = 0

    for (const lockedIdx of locks) {
      const prevIdx = (lockedIdx - 1 + numPoints) % numPoints
      const nextIdx = (lockedIdx + 1) % numPoints

      if (isApproximatelyPerpendicular(currentPoints[prevIdx], currentPoints[lockedIdx], currentPoints[nextIdx], 0.5)) {
        continue
      }

      if (!fixedSet.has(nextIdx)) {
        const adjusted = makePerpendicularAtVertex(currentPoints[prevIdx], currentPoints[lockedIdx], currentPoints[nextIdx])
        const change = adjusted.distanceTo(currentPoints[nextIdx])
        maxChange = Math.max(maxChange, change)
        currentPoints[nextIdx] = adjusted
      }
    }

    if (maxChange < 0.001) break
  }

  return currentPoints
}
