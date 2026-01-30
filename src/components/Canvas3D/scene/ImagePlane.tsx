import { useRef, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTLINE_HEIGHT, PLANE_WIDTH } from '../constants'

export interface ImagePlaneProps {
  textureUrl: string | null
  aspectRatio: number
  isAddingPolygon: boolean
  isMeasuring: boolean
  receiveShadow: boolean
  onPlaneClick: (point: THREE.Vector3) => void
  onMeasureClick: (point: THREE.Vector3) => void
}

export function ImagePlane({
  textureUrl,
  aspectRatio,
  isAddingPolygon,
  isMeasuring,
  receiveShadow,
  onPlaneClick,
  onMeasureClick
}: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useMemo(
    () => (textureUrl ? new THREE.TextureLoader().load(textureUrl) : null),
    [textureUrl]
  )

  const planeWidth = PLANE_WIDTH
  const planeHeight = planeWidth / aspectRatio

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (isAddingPolygon) {
        e.stopPropagation()
        const point = e.point.clone()
        point.y = OUTLINE_HEIGHT
        onPlaneClick(point)
      } else if (isMeasuring) {
        e.stopPropagation()
        const point = e.point.clone()
        point.y = OUTLINE_HEIGHT
        onMeasureClick(point)
      }
    },
    [isAddingPolygon, isMeasuring, onPlaneClick, onMeasureClick]
  )

  if (!texture) return null

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleClick}
      receiveShadow={receiveShadow}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      {receiveShadow ? (
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
      ) : (
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      )}
    </mesh>
  )
}
