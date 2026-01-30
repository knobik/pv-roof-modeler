import { useMemo, useRef } from 'react'
import { Text } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BASE_CAMERA_DISTANCE } from '../constants'

export interface EdgeLabelProps {
  start: THREE.Vector3
  end: THREE.Vector3
  polygonCentroid: THREE.Vector3
  pixelsPerMeter: number
  imageWidth: number
  planeWidth: number
  color?: string
}

export function EdgeLabel({
  start,
  end,
  polygonCentroid,
  pixelsPerMeter,
  imageWidth,
  planeWidth,
  color = '#ffffff',
}: EdgeLabelProps) {
  const textRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  // Calculate static values for label placement
  const { midpoint, outwardNormal, lengthMeters, rotation } = useMemo(() => {
    // Calculate distance in 3D units
    const distance3D = start.distanceTo(end)

    // Convert to pixels: planeWidth units = imageWidth pixels
    const distancePixels = distance3D * (imageWidth / planeWidth)

    // Convert to meters
    const meters = distancePixels / pixelsPerMeter

    // Calculate midpoint
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

    // Calculate edge direction (in XZ plane)
    const direction = new THREE.Vector3().subVectors(end, start).normalize()

    // Calculate perpendicular normal (in the XZ plane)
    const normal1 = new THREE.Vector3(-direction.z, 0, direction.x)
    const normal2 = new THREE.Vector3(direction.z, 0, -direction.x)

    // Choose the normal that points away from the polygon centroid
    const toCenter = new THREE.Vector3().subVectors(polygonCentroid, mid).normalize()
    const outNormal = normal1.dot(toCenter) < 0 ? normal1 : normal2

    // Calculate rotation to make text parallel to edge and lying flat
    // The angle of the edge in the XZ plane (from +X axis, counter-clockwise)
    const edgeAngle = Math.atan2(direction.z, direction.x)

    // We want text to lie flat (face up) and align with the edge
    // rotation.x = -90° to lay flat
    // rotation.z = angle to align with edge direction
    let zRot = -edgeAngle

    // For text to face outward, we need to check if the text's perpendicular direction
    // (left side of text when reading) aligns with the outward normal
    // The perpendicular to the edge direction (rotated 90° CCW in XZ plane) is (-direction.z, 0, direction.x)
    const textPerpendicular = new THREE.Vector3(-direction.z, 0, direction.x)

    // If the perpendicular points inward (opposite to outward normal), flip the text
    if (textPerpendicular.dot(outNormal) < 0) {
      zRot += Math.PI
    }

    // Normalize to -PI to PI range
    while (zRot > Math.PI) zRot -= 2 * Math.PI
    while (zRot < -Math.PI) zRot += 2 * Math.PI

    return {
      midpoint: mid,
      outwardNormal: outNormal,
      lengthMeters: meters,
      rotation: new THREE.Euler(-Math.PI / 2, 0, zRot, 'XYZ'),
    }
  }, [start, end, polygonCentroid, pixelsPerMeter, imageWidth, planeWidth])

  // Scale text and adjust offset based on camera distance
  useFrame(() => {
    if (textRef.current) {
      const distance = camera.position.distanceTo(midpoint)
      const scale = distance / BASE_CAMERA_DISTANCE

      // Scale the text size
      textRef.current.scale.setScalar(scale)

      // Adjust offset distance based on zoom (closer when zoomed in)
      const baseOffset = 0.18
      const dynamicOffset = baseOffset * scale

      // Update position with dynamic offset
      textRef.current.position.copy(midpoint)
      textRef.current.position.addScaledVector(outwardNormal, dynamicOffset)
      textRef.current.position.y = 0.02
    }
  })

  // Don't render if length is too small or invalid
  if (!isFinite(lengthMeters) || lengthMeters < 0.01) {
    return null
  }

  const labelText = lengthMeters >= 1
    ? `${lengthMeters.toFixed(2)}m`
    : `${(lengthMeters * 100).toFixed(0)}cm`

  return (
    <Text
      ref={textRef}
      position={midpoint}
      rotation={rotation}
      fontSize={0.18}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.018}
      outlineColor="#000000"
    >
      {labelText}
    </Text>
  )
}
