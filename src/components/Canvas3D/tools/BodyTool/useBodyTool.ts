import { useCallback } from 'react'
import type { ToolHookReturn } from '../types'
import type { Polygon, Body } from '../../types'

export interface UseBodyToolOptions {
  polygons: Polygon[]
  bodies: Body[]
  setBodies: (bodies: Body[]) => void
}

export function useBodyTool({
  polygons,
  bodies,
  setBodies,
}: UseBodyToolOptions): ToolHookReturn {
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

  return {
    state: {},
    actions: {
      onPolygonClick,
    },
    render: {
      SceneElements: null,
      UIElements: null,
      statusText: 'Click on a polygon to create a 3D body • Right-click body to delete',
    },
    handleDeleteBody,
  } as ToolHookReturn & {
    handleDeleteBody: (bodyId: string) => void
  }
}
