import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POINT_SIZE, BASE_CAMERA_DISTANCE } from '../constants'

export interface ScaledPointProps {
  position: THREE.Vector3
  color: string
  size?: number
}

export function ScaledPoint({ position, color, size = POINT_SIZE }: ScaledPointProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  useFrame(() => {
    if (meshRef.current) {
      const distance = camera.position.distanceTo(position)
      const scale = distance / BASE_CAMERA_DISTANCE
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
