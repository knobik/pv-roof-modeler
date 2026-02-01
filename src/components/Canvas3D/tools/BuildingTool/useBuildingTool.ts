import { useCallback } from 'react'
import type { ToolHookReturn, BuildingToolState } from '../types'
import type { Building } from '../../types'
import { DEFAULT_ROOF_TYPE, DEFAULT_ROOF_PITCH } from '../../constants'
import { useCanvasContext } from '../../context/CanvasContext'

export interface BuildingToolExtended extends ToolHookReturn<BuildingToolState> {
  handleDeleteBuilding: (buildingId: string) => void
}

export function useBuildingTool(): BuildingToolExtended {
  const { polygons, buildings, setBuildings } = useCanvasContext()

  const onPolygonClick = useCallback(
    (polygonId: string) => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon) return

      // Check if building already exists for this polygon
      const existingBuilding = buildings.find((b) => b.polygonId === polygonId)
      if (existingBuilding) return

      const newBuilding: Building = {
        id: crypto.randomUUID(),
        polygonId: polygon.id,
        points: polygon.points.map((p) => p.clone()),
        height: 0.5, // default height
        color: polygon.color,
        roofType: DEFAULT_ROOF_TYPE,
        roofPitch: DEFAULT_ROOF_PITCH,
      }

      setBuildings([...buildings, newBuilding])
    },
    [polygons, buildings, setBuildings]
  )

  const handleDeleteBuilding = useCallback(
    (buildingId: string) => {
      setBuildings(buildings.filter((b) => b.id !== buildingId))
    },
    [buildings, setBuildings]
  )

  // Building click handler for deletion via right-click
  const onBuildingClick = useCallback(
    (buildingId: string) => {
      handleDeleteBuilding(buildingId)
    },
    [handleDeleteBuilding]
  )

  return {
    state: {},
    actions: {
      onPolygonClick,
      onBuildingClick,
    },
    render: {
      statusText: 'Click on a polygon to create a 3D building • Right-click building to delete',
    },
    handleDeleteBuilding,
  }
}
