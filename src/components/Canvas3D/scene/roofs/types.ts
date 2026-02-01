import * as THREE from 'three'

export interface RoofGeometryResult {
  roofMesh: THREE.BufferGeometry // Main roof surface(s)
  gableMesh?: THREE.BufferGeometry // Optional gable end walls (for gabled, half-hip)
}

export interface RoofGeometryParams {
  points: THREE.Vector3[] // Base polygon points (XZ plane)
  wallHeight: number // Height of walls (eave level)
  roofPitch: number // Angle in degrees
  roofRotation: number // Rotation in degrees (0-360)
}

export interface PolygonAnalysis {
  centroid: THREE.Vector3
  boundingBox: {
    min: THREE.Vector2
    max: THREE.Vector2
  }
  ridgeDirection: 'x' | 'z' // Ridge runs along this axis (before rotation)
  ridgeAngle: number // Ridge angle in radians (includes rotation)
  width: number // Perpendicular to ridge
  length: number // Along ridge
}
