import { useState, useCallback } from 'react'
import { Canvas3D } from '../Canvas3D'
import type { Canvas3DProps, Polygon, Body } from '../Canvas3D'
import { PolygonList } from '../PolygonList'
import './PVRoofModeler.css'

export interface PVRoofModelerProps {
  /** Canvas width (default: '100%') */
  width?: Canvas3DProps['width']
  /** Canvas height (default: 500) */
  height?: Canvas3DProps['height']
  /** Background color (default: '#1a1a2e') */
  backgroundColor?: string
  /** Size of the grid helper (default: 10) */
  gridSize?: number
  /** Show grid helper (default: true) */
  showGrid?: boolean
  /** Enable shadow casting for bodies (default: true) */
  shadows?: boolean
  /** Time of day in hours (0-24), affects sun position and shadows (default: 10) */
  timeOfDay?: number
  /** Show time of day slider control (default: true) */
  showTimeControl?: boolean
  /** Latitude for realistic sun position (e.g., 52.2297 for Warsaw) */
  latitude?: number
  /** Longitude for realistic sun position (e.g., 21.0122 for Warsaw) */
  longitude?: number
  /** Date for sun position calculation (default: current date) */
  date?: Date
  /** Width of the polygon list sidebar (default: 280) */
  sidebarWidth?: number | string
  /** Position of the sidebar (default: 'right') */
  sidebarPosition?: 'left' | 'right'
  /** Hide the sidebar completely (default: false) */
  hideSidebar?: boolean
  /** Controlled polygons array */
  polygons?: Polygon[]
  /** Controlled bodies array */
  bodies?: Body[]
  /** Callback when polygons change */
  onPolygonsChange?: (polygons: Polygon[]) => void
  /** Callback when bodies change */
  onBodiesChange?: (bodies: Body[]) => void
  /** Callback when an image is loaded */
  onImageLoad?: (file: File) => void
  /** Callback when selection changes */
  onSelectionChange?: (polygonId: string | null) => void
  /** Callback when time of day changes */
  onTimeOfDayChange?: (time: number) => void
}

export function PVRoofModeler({
  width = '100%',
  height = 500,
  backgroundColor = '#1a1a2e',
  gridSize = 10,
  showGrid = true,
  shadows = true,
  timeOfDay,
  showTimeControl = true,
  latitude,
  longitude,
  date,
  sidebarWidth = 280,
  sidebarPosition = 'right',
  hideSidebar = false,
  polygons: controlledPolygons,
  bodies: controlledBodies,
  onPolygonsChange,
  onBodiesChange,
  onImageLoad,
  onSelectionChange,
  onTimeOfDayChange,
}: PVRoofModelerProps) {
  // Internal state for uncontrolled mode
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBodies, setInternalBodies] = useState<Body[]>([])
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null)

  // Determine controlled vs uncontrolled
  const isPolygonsControlled = controlledPolygons !== undefined
  const isBodiesControlled = controlledBodies !== undefined

  const polygons = isPolygonsControlled ? controlledPolygons : internalPolygons
  const bodies = isBodiesControlled ? controlledBodies : internalBodies

  // Polygon handlers
  const handlePolygonsChange = useCallback(
    (newPolygons: Polygon[]) => {
      if (!isPolygonsControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [isPolygonsControlled, onPolygonsChange]
  )

  const handleDeletePolygon = useCallback(
    (polygonId: string) => {
      const newPolygons = polygons.filter((p) => p.id !== polygonId)
      // Also delete associated bodies
      const newBodies = bodies.filter((b) => b.polygonId !== polygonId)

      handlePolygonsChange(newPolygons)

      if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)

      if (selectedPolygonId === polygonId) {
        setSelectedPolygonId(null)
        onSelectionChange?.(null)
      }
    },
    [polygons, bodies, isBodiesControlled, selectedPolygonId, handlePolygonsChange, onBodiesChange, onSelectionChange]
  )

  const handlePolygonColorChange = useCallback(
    (polygonId: string, color: string) => {
      const newPolygons = polygons.map((p) =>
        p.id === polygonId ? { ...p, color } : p
      )
      handlePolygonsChange(newPolygons)
    },
    [polygons, handlePolygonsChange]
  )

  // Body handlers
  const handleBodiesChange = useCallback(
    (newBodies: Body[]) => {
      if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [isBodiesControlled, onBodiesChange]
  )

  const handleDeleteBody = useCallback(
    (bodyId: string) => {
      const newBodies = bodies.filter((b) => b.id !== bodyId)
      handleBodiesChange(newBodies)
    },
    [bodies, handleBodiesChange]
  )

  const handleBodyColorChange = useCallback(
    (bodyId: string, color: string) => {
      const newBodies = bodies.map((b) =>
        b.id === bodyId ? { ...b, color } : b
      )
      handleBodiesChange(newBodies)
    },
    [bodies, handleBodiesChange]
  )

  const handleBodyHeightChange = useCallback(
    (bodyId: string, height: number) => {
      const newBodies = bodies.map((b) =>
        b.id === bodyId ? { ...b, height } : b
      )
      handleBodiesChange(newBodies)
    },
    [bodies, handleBodiesChange]
  )

  // Selection handler
  const handleSelectPolygon = useCallback(
    (polygonId: string | null) => {
      setSelectedPolygonId(polygonId)
      onSelectionChange?.(polygonId)
    },
    [onSelectionChange]
  )

  const sidebar = !hideSidebar && (
    <div
      className="pv-roof-modeler-sidebar"
      style={{ width: sidebarWidth }}
    >
      <PolygonList
        polygons={polygons}
        bodies={bodies}
        selectedPolygonId={selectedPolygonId}
        onSelectPolygon={handleSelectPolygon}
        onDeletePolygon={handleDeletePolygon}
        onPolygonColorChange={handlePolygonColorChange}
        onDeleteBody={handleDeleteBody}
        onBodyColorChange={handleBodyColorChange}
        onBodyHeightChange={handleBodyHeightChange}
      />
    </div>
  )

  return (
    <div className="pv-roof-modeler" style={{ width, height }}>
      {sidebarPosition === 'left' && sidebar}
      <div className="pv-roof-modeler-canvas">
        <Canvas3D
          width="100%"
          height="100%"
          backgroundColor={backgroundColor}
          gridSize={gridSize}
          showGrid={showGrid}
          shadows={shadows}
          timeOfDay={timeOfDay}
          showTimeControl={showTimeControl}
          latitude={latitude}
          longitude={longitude}
          date={date}
          polygons={polygons}
          bodies={bodies}
          onPolygonsChange={handlePolygonsChange}
          onTimeOfDayChange={onTimeOfDayChange}
          onBodiesChange={handleBodiesChange}
          onImageLoad={onImageLoad}
        />
      </div>
      {sidebarPosition === 'right' && sidebar}
    </div>
  )
}
