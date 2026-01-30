import { useRef, useState, useCallback, useMemo } from 'react'
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTLINE_HEIGHT, BASE_CAMERA_DISTANCE, MIN_DISTANCE_FROM_POINT } from '../constants'

export interface ClickableEdgeProps {
  start: THREE.Vector3
  end: THREE.Vector3
  allPoints: THREE.Vector3[]
  onAddPoint: (position: THREE.Vector3) => void
}

export function ClickableEdge({ start, end, allPoints, onAddPoint }: ClickableEdgeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const { camera } = useThree()

  const midpoint = useMemo(() => {
    return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  }, [start, end])

  const length = useMemo(() => start.distanceTo(end), [start, end])

  const rotation = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start).normalize()
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return euler
  }, [start, end])

  // Scale edge thickness based on camera distance (only X and Z, not Y which is the length)
  useFrame(() => {
    if (meshRef.current) {
      const distance = camera.position.distanceTo(midpoint)
      const scale = distance / BASE_CAMERA_DISTANCE
      meshRef.current.scale.set(scale, 1, scale)
    }
  })

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const clickPoint = e.point.clone()
      clickPoint.y = OUTLINE_HEIGHT

      // Don't add point if too close to existing points
      const tooCloseToPoint = allPoints.some(
        (p) => clickPoint.distanceTo(p) < MIN_DISTANCE_FROM_POINT
      )
      if (tooCloseToPoint) return

      onAddPoint(clickPoint)
    },
    [onAddPoint, allPoints]
  )

  return (
    <mesh
      ref={meshRef}
      position={midpoint}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <cylinderGeometry args={[isHovered ? 0.04 : 0.02, isHovered ? 0.04 : 0.02, length, 8]} />
      <meshBasicMaterial
        color={isHovered ? '#00ffff' : '#ffffff'}
        transparent
        opacity={isHovered ? 0.6 : 0}
      />
    </mesh>
  )
}
