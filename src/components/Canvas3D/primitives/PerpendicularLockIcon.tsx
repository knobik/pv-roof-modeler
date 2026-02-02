import { useRef, useState, useCallback, useMemo } from 'react'
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber'
import { Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import { OUTLINE_HEIGHT, BASE_CAMERA_DISTANCE } from '../constants'

export interface PerpendicularLockIconProps {
  vertex: THREE.Vector3
  prev: THREE.Vector3
  next: THREE.Vector3
  isClickable: boolean
  onClick?: () => void
}

// Base size for the arc radius (will be scaled by camera distance)
const ARC_RADIUS = 0.15
const ARC_SEGMENTS = 12

export function PerpendicularLockIcon({
  vertex,
  prev,
  next,
  isClickable,
  onClick,
}: PerpendicularLockIconProps) {
  const groupRef = useRef<THREE.Group>(null)
  const textRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const { camera } = useThree()

  // Calculate arc points and text rotation for 90 degree indicator
  const { arcPoints, textDirection, textRotation } = useMemo(() => {
    const toPrev = new THREE.Vector2(prev.x - vertex.x, prev.z - vertex.z).normalize()
    const toNext = new THREE.Vector2(next.x - vertex.x, next.z - vertex.z).normalize()

    // Get the starting angle (direction to prev) and ending angle (direction to next)
    const startAngle = Math.atan2(toPrev.y, toPrev.x)
    const endAngle = Math.atan2(toNext.y, toNext.x)

    // Calculate the arc going the "short way" (90 degrees)
    let angleDiff = endAngle - startAngle
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

    // Generate arc points
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = i / ARC_SEGMENTS
      const angle = startAngle + angleDiff * t
      points.push(new THREE.Vector3(
        Math.cos(angle) * ARC_RADIUS,
        0.005,
        Math.sin(angle) * ARC_RADIUS
      ))
    }

    // Calculate text direction - pointing outward along the bisector
    const midAngle = startAngle + angleDiff * 0.5
    const direction = new THREE.Vector3(
      Math.cos(midAngle),
      0,
      Math.sin(midAngle)
    )

    // Calculate rotation to make text parallel to the bisector and lying flat
    // Similar to EdgeLabel: rotation.x = -90° to lay flat, rotation.z = angle to align
    // The text should read along the direction pointing outward, with bottom toward vertex
    let zRot = -midAngle + Math.PI / 2

    // Normalize to -PI to PI range
    while (zRot > Math.PI) zRot -= 2 * Math.PI
    while (zRot < -Math.PI) zRot += 2 * Math.PI

    return {
      arcPoints: points,
      textDirection: direction,
      textRotation: new THREE.Euler(-Math.PI / 2, 0, zRot, 'XYZ'),
    }
  }, [vertex, prev, next])

  // Scale icon and text based on camera distance
  useFrame(() => {
    if (groupRef.current) {
      const distance = camera.position.distanceTo(vertex)
      const scale = distance / BASE_CAMERA_DISTANCE
      groupRef.current.scale.setScalar(scale)
    }

    if (textRef.current) {
      // Update text position with dynamic offset
      const baseOffset = ARC_RADIUS * 2.2
      textRef.current.position.set(
        textDirection.x * baseOffset,
        0.02,
        textDirection.z * baseOffset
      )
    }
  })

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (isClickable && onClick) {
        e.stopPropagation()
        onClick()
      }
    },
    [isClickable, onClick]
  )

  // Use white for visibility, orange on hover
  const displayColor = isHovered && isClickable ? '#ff6600' : '#ffffff'

  return (
    <group ref={groupRef} position={[vertex.x, OUTLINE_HEIGHT, vertex.z]}>
      {/* 90 degree arc indicator */}
      <Line
        points={arcPoints}
        color={displayColor}
        lineWidth={3}
      />
      {/* 90° label */}
      <Text
        ref={textRef}
        rotation={textRotation}
        fontSize={0.12}
        color={displayColor}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.012}
        outlineColor="#000000"
      >
        90°
      </Text>
      {/* Invisible click target at the arc center */}
      <mesh
        position={[0, 0.005, 0]}
        onPointerDown={handlePointerDown}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <cylinderGeometry args={[ARC_RADIUS * 0.7, ARC_RADIUS * 0.7, 0.01, 16]} />
        <meshBasicMaterial color={displayColor} transparent opacity={0} />
      </mesh>
    </group>
  )
}
