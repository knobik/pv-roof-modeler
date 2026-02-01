import { useState, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Building } from '../types'
import { PLANE_WIDTH, DEFAULT_ROOF_TYPE, DEFAULT_ROOF_PITCH, DEFAULT_ROOF_ROTATION } from '../constants'
import { createRoofGeometry } from './roofs'

export interface BuildingBodyProps {
  building: Building
  isAddingBuilding: boolean
  imageUrl: string | null
  aspectRatio: number
  castShadow: boolean
  onDelete: () => void
}

// Apply UV mapping for aerial texture projection
function applyAerialUVs(geometry: THREE.BufferGeometry, aspectRatio: number): void {
  const planeHeight = PLANE_WIDTH / aspectRatio
  const posAttribute = geometry.attributes.position

  const uvs = new Float32Array(posAttribute.count * 2)

  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i)
    const z = posAttribute.getZ(i)

    // Map world coordinates to UV (0-1 range)
    const u = (x + PLANE_WIDTH / 2) / PLANE_WIDTH
    // Flip v to match image orientation
    const v = 1 - (z + planeHeight / 2) / planeHeight

    uvs[i * 2] = u
    uvs[i * 2 + 1] = v
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

export function BuildingBody({
  building,
  isAddingBuilding,
  imageUrl,
  aspectRatio,
  castShadow,
  onDelete,
}: BuildingBodyProps) {
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

  // Create roof geometry using factory
  const roofResult = useMemo(() => {
    const roofType = building.roofType ?? DEFAULT_ROOF_TYPE
    const roofPitch = building.roofPitch ?? DEFAULT_ROOF_PITCH
    const roofRotation = building.roofRotation ?? DEFAULT_ROOF_ROTATION

    return createRoofGeometry(roofType, {
      points: building.points,
      wallHeight: building.height,
      roofPitch,
      roofRotation,
    })
  }, [building.points, building.height, building.roofType, building.roofPitch, building.roofRotation])

  // Apply UV mapping to roof geometry for aerial texture projection
  const roofGeometry = useMemo(() => {
    const geo = roofResult.roofMesh.clone()
    applyAerialUVs(geo, aspectRatio)
    return geo
  }, [roofResult.roofMesh, aspectRatio])

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (isAddingBuilding) {
        e.stopPropagation()
        onDelete()
      }
    },
    [isAddingBuilding, onDelete]
  )

  const wallColor = isHovered && isAddingBuilding ? '#ff6666' : building.color

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
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Roof surface */}
      <mesh geometry={roofGeometry} castShadow={castShadow} receiveShadow={castShadow}>
        {texture ? (
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        ) : (
          <meshStandardMaterial color={building.color} side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Gable walls (for gabled, half-hip roofs) */}
      {roofResult.gableMesh && (
        <mesh geometry={roofResult.gableMesh} castShadow={castShadow} receiveShadow={castShadow}>
          <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
