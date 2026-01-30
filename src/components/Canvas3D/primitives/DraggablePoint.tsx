import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { OUTLINE_HEIGHT, POINT_SIZE, POINT_SIZE_HOVER, BASE_CAMERA_DISTANCE } from '../constants'

export interface DraggablePointProps {
  position: THREE.Vector3
  color: string
  canDelete: boolean
  isSelectMode: boolean
  isSelected: boolean
  onDragStart: () => void
  onDrag: (newPosition: THREE.Vector3) => void
  onDragEnd: () => void
  onDelete: () => void
  onSelect: () => void
}

export function DraggablePoint({
  position,
  color,
  canDelete,
  isSelectMode,
  isSelected,
  onDragStart,
  onDrag,
  onDragEnd,
  onDelete,
  onSelect,
}: DraggablePointProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const { camera, raycaster, gl } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])

  // Scale point based on camera distance to maintain consistent visual size
  useFrame(() => {
    if (meshRef.current) {
      const distance = camera.position.distanceTo(position)
      const scale = distance / BASE_CAMERA_DISTANCE
      meshRef.current.scale.setScalar(scale)
    }
  })

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersection)

      if (intersection) {
        intersection.y = OUTLINE_HEIGHT
        onDrag(intersection)
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      onDragEnd()
    }

    gl.domElement.addEventListener('pointermove', handlePointerMove)
    gl.domElement.addEventListener('pointerup', handlePointerUp)

    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove)
      gl.domElement.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, camera, raycaster, gl, plane, onDrag, onDragEnd])

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (isSelectMode) {
        onSelect()
      } else {
        setIsDragging(true)
        onDragStart()
      }
    },
    [isSelectMode, onSelect, onDragStart]
  )

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (canDelete && !isSelectMode) {
        onDelete()
      }
    },
    [canDelete, isSelectMode, onDelete]
  )

  const size = isHovered || isDragging || isSelected ? POINT_SIZE_HOVER : POINT_SIZE

  const getColor = () => {
    if (isSelected) return '#00ff00'
    if (isDragging) return '#ffffff'
    if (isHovered && isSelectMode) return '#00ffff'
    if (isHovered && canDelete) return '#ff6600'
    if (isHovered) return '#ffff00'
    return color
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={getColor()} />
    </mesh>
  )
}
