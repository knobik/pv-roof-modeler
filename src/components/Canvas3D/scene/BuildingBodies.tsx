import type { Building } from '../types'
import { BuildingBody } from './BuildingBody'

export interface BuildingBodiesProps {
  buildings: Building[]
  isAddingBuilding: boolean
  imageUrl: string | null
  aspectRatio: number
  castShadow: boolean
  onDeleteBuilding: (buildingId: string) => void
}

export function BuildingBodies({ buildings, isAddingBuilding, imageUrl, aspectRatio, castShadow, onDeleteBuilding }: BuildingBodiesProps) {
  return (
    <>
      {buildings.map((building) => {
        // Skip hidden buildings
        if (building.visible === false) return null

        return (
          <BuildingBody
            key={building.id}
            building={building}
            isAddingBuilding={isAddingBuilding}
            imageUrl={imageUrl}
            aspectRatio={aspectRatio}
            castShadow={castShadow}
            onDelete={() => onDeleteBuilding(building.id)}
          />
        )
      })}
    </>
  )
}
