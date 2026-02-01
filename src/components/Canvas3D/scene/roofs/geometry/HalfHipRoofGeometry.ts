import * as THREE from 'three'
import type { RoofGeometryParams, RoofGeometryResult } from '../types'
import {
  analyzePolygon,
  calculateRoofHeight,
  projectToRidgeLine,
  getRidgeSide,
} from '../utils/polygonAnalysis'

// Half-hip (jerkinhead) roof: gabled roof with small hipped sections at the ends
// Combines gabled slopes with clipped hip ends
export function createHalfHipRoofGeometry(params: RoofGeometryParams): RoofGeometryResult {
  const { points, wallHeight, roofPitch, roofRotation } = params
  const analysis = analyzePolygon(points, roofRotation)
  const roofHeight = calculateRoofHeight(analysis.width, roofPitch)

  const { centroid, ridgeAngle } = analysis
  const ridgeY = wallHeight + roofHeight

  // Half-hip has a partial gable that's clipped at the top
  const clipRatio = 0.3 // How much of the gable is clipped (30%)
  const clipY = wallHeight + roofHeight * (1 - clipRatio)

  // Project vertex onto the ridge line
  function projectToRidge(point: THREE.Vector3): THREE.Vector3 {
    return projectToRidgeLine(point, centroid, ridgeAngle, ridgeY)
  }

  // Get which side of the ridge a point is on
  function getSide(point: THREE.Vector3): number {
    return getRidgeSide(point, centroid, ridgeAngle)
  }

  // Project to clip level (partial height toward ridge)
  function projectToClipLevel(point: THREE.Vector3): THREE.Vector3 {
    const ridge = projectToRidge(point)
    const t = 1 - clipRatio
    return new THREE.Vector3(
      point.x + (ridge.x - point.x) * t,
      clipY,
      point.z + (ridge.z - point.z) * t
    )
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
      // Slope edge - create quadrilateral from edge to ridge
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
      // Gable edge - create partial gable wall + hip triangle at top
      const clip1 = projectToClipLevel(p1)
      const clip2 = projectToClipLevel(p2)

      // Find ridge crossing point
      const ridgePoint = findRidgeCrossing(p1, p2, centroid, ridgeAngle, ridgeY)

      // Lower gable wall (trapezoid from base to clip level)
      gableVertices.push(
        p1.x, wallHeight, p1.z,
        p2.x, wallHeight, p2.z,
        clip2.x, clip2.y, clip2.z,
        clip1.x, clip1.y, clip1.z
      )

      gableIndices.push(
        gableVertexIndex, gableVertexIndex + 1, gableVertexIndex + 2,
        gableVertexIndex, gableVertexIndex + 2, gableVertexIndex + 3
      )
      gableVertexIndex += 4

      // Upper hip triangle (from clip level to ridge)
      roofVertices.push(
        clip1.x, clip1.y, clip1.z,
        clip2.x, clip2.y, clip2.z,
        ridgePoint.x, ridgePoint.y, ridgePoint.z
      )

      roofIndices.push(roofVertexIndex, roofVertexIndex + 1, roofVertexIndex + 2)
      roofVertexIndex += 3
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

// Find the point where edge crosses the ridge line
function findRidgeCrossing(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  centroid: THREE.Vector3,
  ridgeAngle: number,
  ridgeY: number
): THREE.Vector3 {
  const ridgeDir = new THREE.Vector2(Math.cos(ridgeAngle), Math.sin(ridgeAngle))
  const perpDir = new THREE.Vector2(-ridgeDir.y, ridgeDir.x)

  const d1 = (p1.x - centroid.x) * perpDir.x + (p1.z - centroid.z) * perpDir.y
  const d2 = (p2.x - centroid.x) * perpDir.x + (p2.z - centroid.z) * perpDir.y

  const t = Math.abs(d2 - d1) < 0.0001 ? 0.5 : d1 / (d1 - d2)
  const crossX = p1.x + t * (p2.x - p1.x)
  const crossZ = p1.z + t * (p2.z - p1.z)

  return new THREE.Vector3(crossX, ridgeY, crossZ)
}
