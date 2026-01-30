import { useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTLINE_HEIGHT } from '../constants'

export interface PolygonFillProps {
  points: THREE.Vector3[]
  color: string
  onClick: () => void
}

export function PolygonFill({ points, color, onClick }: PolygonFillProps) {
  const [isHovered, setIsHovered] = useState(false)

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    // Negate Z to counteract the rotation's Z flip
    shape.moveTo(points[0].x, -points[0].z)

    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, -points[i].z)
    }
    shape.closePath()

    return new THREE.ShapeGeometry(shape)
  }, [points])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onClick()
    },
    [onClick]
  )

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, OUTLINE_HEIGHT + 0.001, 0]}
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <meshBasicMaterial
        color={isHovered ? '#00ff00' : color}
        transparent
        opacity={isHovered ? 0.4 : 0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
