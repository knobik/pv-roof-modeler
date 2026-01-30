import { useRef, useState, useCallback } from 'react'
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { POINT_SIZE, POINT_SIZE_HOVER, BASE_CAMERA_DISTANCE } from '../constants'

export interface ClosingPointProps {
  position: THREE.Vector3
  color: string
  canClose: boolean
  onClose: () => void
}

export function ClosingPoint({ position, color, canClose, onClose }: ClosingPointProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const { camera } = useThree()

  // Scale point based on camera distance to maintain consistent visual size
  useFrame(() => {
    if (meshRef.current) {
      const distance = camera.position.distanceTo(position)
      const scale = distance / BASE_CAMERA_DISTANCE
      meshRef.current.scale.setScalar(scale)
    }
  })

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!canClose) return
      e.stopPropagation()
      onClose()
    },
    [canClose, onClose]
  )

  const size = isHovered && canClose ? POINT_SIZE_HOVER : POINT_SIZE

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={isHovered && canClose ? '#00ff00' : color} />
    </mesh>
  )
}
