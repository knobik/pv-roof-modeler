import { useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Building } from '../types'
import { PLANE_WIDTH } from '../constants'

export interface BuildingBodyProps {
  building: Building
  isAddingBuilding: boolean
  imageUrl: string | null
  aspectRatio: number
  castShadow: boolean
  onDelete: () => void
}

export function BuildingBody({ building, isAddingBuilding, imageUrl, aspectRatio, castShadow, onDelete }: BuildingBodyProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Load the image texture
  const texture = useMemo(() => {
    if (!imageUrl) return null
    const tex = new THREE.TextureLoader().load(imageUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [imageUrl])

  // Create the extruded geometry for the walls
  const wallsGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const firstPoint = building.points[0]
    shape.moveTo(firstPoint.x, -firstPoint.z)

    for (let i = 1; i < building.points.length; i++) {
      shape.lineTo(building.points[i].x, -building.points[i].z)
    }
    shape.closePath()

    const extrudeSettings = {
      depth: building.height,
      bevelEnabled: false,
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [building.points, building.height])

  // Create the top face geometry with proper UV mapping for texture projection
  const topGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const firstPoint = building.points[0]
    shape.moveTo(firstPoint.x, -firstPoint.z)

    for (let i = 1; i < building.points.length; i++) {
      shape.lineTo(building.points[i].x, -building.points[i].z)
    }
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)

    // Calculate UV coordinates to project the image onto the top face
    const planeHeight = PLANE_WIDTH / aspectRatio
    const uvAttribute = geo.attributes.uv
    const posAttribute = geo.attributes.position

    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i)
      const y = posAttribute.getY(i) // This is -z in world coords

      // Map world coordinates to UV (0-1 range)
      // u maps from x, v maps from z (y in shape coords is -z)
      const u = (x + PLANE_WIDTH / 2) / PLANE_WIDTH
      // Flip v to match image orientation
      const v = 1 - (-y + planeHeight / 2) / planeHeight

      uvAttribute.setXY(i, u, v)
    }

    uvAttribute.needsUpdate = true
    return geo
  }, [building.points, aspectRatio])

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (isAddingBuilding) {
        e.stopPropagation()
        onDelete()
      }
    },
    [isAddingBuilding, onDelete]
  )

  return (
    <group
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
    >
      {/* Walls */}
      <mesh
        geometry={wallsGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        castShadow={castShadow}
        receiveShadow={castShadow}
      >
        <meshStandardMaterial
          color={isHovered && isAddingBuilding ? '#ff6666' : building.color}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Top face with image texture - slightly above to avoid z-fighting */}
      <mesh
        geometry={topGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, building.height + 0.001, 0]}
        castShadow={castShadow}
      >
        {texture ? (
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        ) : (
          <meshStandardMaterial color={building.color} side={THREE.DoubleSide} />
        )}
      </mesh>
    </group>
  )
}
