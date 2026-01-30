import { useCallback } from 'react'
import type { ToolHookReturn } from '../types'
import type { Body } from '../../types'
import { useCanvasContext } from '../../context/CanvasContext'

export interface BodyToolExtended extends ToolHookReturn {
  handleDeleteBody: (bodyId: string) => void
}

export function useBodyTool(): BodyToolExtended {
  const { polygons, bodies, setBodies } = useCanvasContext()

  const onPolygonClick = useCallback(
    (polygonId: string) => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon) return

      // Check if body already exists for this polygon
      const existingBody = bodies.find((b) => b.polygonId === polygonId)
      if (existingBody) return

      const newBody: Body = {
        id: crypto.randomUUID(),
        polygonId: polygon.id,
        points: polygon.points.map((p) => p.clone()),
        height: 0.5,  // default height
        color: polygon.color,
      }

      setBodies([...bodies, newBody])
    },
    [polygons, bodies, setBodies]
  )

  const handleDeleteBody = useCallback(
    (bodyId: string) => {
      setBodies(bodies.filter((b) => b.id !== bodyId))
    },
    [bodies, setBodies]
  )

  // Body click handler for deletion via right-click
  const onBodyClick = useCallback(
    (bodyId: string) => {
      handleDeleteBody(bodyId)
    },
    [handleDeleteBody]
  )

  return {
    state: {},
    actions: {
      onPolygonClick,
      onBodyClick,
    },
    render: {
      statusText: 'Click on a polygon to create a 3D body • Right-click body to delete',
    },
    handleDeleteBody,
  }
}