import { useState, useCallback, useEffect, useRef } from 'react'
import { Canvas3D } from '../Canvas3D'
import type { Canvas3DProps, Polygon, Building } from '../Canvas3D'
import { PolygonList } from '../PolygonList'
import { HistoryProvider, useHistoryOptional } from '../../hooks/useHistory'
import type { HistoryContextValue } from '../../hooks/useHistory'
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
  /** Enable shadow casting for buildings (default: true) */
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
  /** Pixels per meter ratio for scaling calculations */
  pixelsPerMeter?: number
  /** Width of the polygon list sidebar (default: 280) */
  sidebarWidth?: number | string
  /** Position of the sidebar (default: 'right') */
  sidebarPosition?: 'left' | 'right'
  /** Hide the sidebar completely (default: false) */
  hideSidebar?: boolean
  /** Controlled polygons array */
  polygons?: Polygon[]
  /** Controlled buildings array */
  buildings?: Building[]
  /** External history context (for controlled mode with external history management) */
  historyContext?: HistoryContextValue
  /** Callback when polygons change */
  onPolygonsChange?: (polygons: Polygon[]) => void
  /** Callback when buildings change */
  onBuildingsChange?: (buildings: Building[]) => void
  /** Callback when an image is loaded */
  onImageLoad?: (file: File) => void
  /** Callback when selection changes */
  onSelectionChange?: (polygonId: string | null) => void
  /** Callback when time of day changes */
  onTimeOfDayChange?: (time: number) => void
  /** Callback when pixels per meter is calculated via measurement tool */
  onPixelsPerMeterChange?: (pixelsPerMeter: number) => void
}

interface PVRoofModelerInnerProps extends PVRoofModelerProps {
  internalHistory: HistoryContextValue | null
}

function PVRoofModelerInner({
  width = '100%',
  height = 500,
  backgroundColor = '#e8e8f0',
  gridSize = 10,
  showGrid = true,
  shadows = true,
  timeOfDay,
  showTimeControl = true,
  latitude,
  longitude,
  date,
  pixelsPerMeter,
  sidebarWidth = 280,
  sidebarPosition = 'right',
  hideSidebar = false,
  polygons: controlledPolygons,
  buildings: controlledBuildings,
  historyContext: externalHistory,
  onPolygonsChange,
  onBuildingsChange,
  onImageLoad,
  onSelectionChange,
  onTimeOfDayChange,
  onPixelsPerMeterChange,
  internalHistory,
}: PVRoofModelerInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null)
  const [imageWidth, setImageWidth] = useState<number | null>(null)

  // Use external history if provided, otherwise use internal
  const history = externalHistory || internalHistory

  // For uncontrolled mode without external history, use internal history state
  // For controlled mode, use controlled props
  const isPolygonsControlled = controlledPolygons !== undefined
  const isBuildingsControlled = controlledBuildings !== undefined

  // Internal state for uncontrolled mode without history
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBuildings, setInternalBuildings] = useState<Building[]>([])

  // Track if we're currently dragging sliders for batch operations
  const isDraggingHeightRef = useRef(false)

  // Determine which state to use
  const polygons = isPolygonsControlled
    ? controlledPolygons
    : history
      ? history.state.polygons
      : internalPolygons

  const buildings = isBuildingsControlled
    ? controlledBuildings
    : history
      ? history.state.buildings
      : internalBuildings

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!history) return

      // Check if we're in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        history.undo()
      } else if (isCtrlOrCmd && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        history.redo()
      } else if (isCtrlOrCmd && e.key === 'y') {
        e.preventDefault()
        history.redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history])

  // Polygon handlers
  const handlePolygonsChange = useCallback(
    (newPolygons: Polygon[]) => {
      if (history && !isPolygonsControlled) {
        history.setPolygons(newPolygons)
      } else if (!isPolygonsControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [history, isPolygonsControlled, onPolygonsChange]
  )

  const handleDeletePolygon = useCallback(
    (polygonId: string) => {
      history?.takeSnapshot()

      const newPolygons = polygons.filter((p) => p.id !== polygonId)
      const newBuildings = buildings.filter((b) => b.polygonId !== polygonId)

      if (history && !isPolygonsControlled) {
        history.setPolygons(newPolygons)
      } else if (!isPolygonsControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)

      if (history && !isBuildingsControlled) {
        history.setBuildings(newBuildings)
      } else if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)

      if (selectedPolygonId === polygonId) {
        setSelectedPolygonId(null)
        onSelectionChange?.(null)
      }
    },
    [polygons, buildings, history, isPolygonsControlled, isBuildingsControlled, selectedPolygonId, onPolygonsChange, onBuildingsChange, onSelectionChange]
  )

  const handlePolygonColorChange = useCallback(
    (polygonId: string, color: string) => {
      history?.takeSnapshot()

      const newPolygons = polygons.map((p) =>
        p.id === polygonId ? { ...p, color } : p
      )

      if (history && !isPolygonsControlled) {
        history.setPolygons(newPolygons)
      } else if (!isPolygonsControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [polygons, history, isPolygonsControlled, onPolygonsChange]
  )

  // Building handlers
  const handleBuildingsChange = useCallback(
    (newBuildings: Building[]) => {
      if (history && !isBuildingsControlled) {
        history.setBuildings(newBuildings)
      } else if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)
    },
    [history, isBuildingsControlled, onBuildingsChange]
  )

  const handleDeleteBuilding = useCallback(
    (buildingId: string) => {
      history?.takeSnapshot()

      const newBuildings = buildings.filter((b) => b.id !== buildingId)

      if (history && !isBuildingsControlled) {
        history.setBuildings(newBuildings)
      } else if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)
    },
    [buildings, history, isBuildingsControlled, onBuildingsChange]
  )

  const handleBuildingColorChange = useCallback(
    (buildingId: string, color: string) => {
      history?.takeSnapshot()

      const newBuildings = buildings.map((b) =>
        b.id === buildingId ? { ...b, color } : b
      )

      if (history && !isBuildingsControlled) {
        history.setBuildings(newBuildings)
      } else if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)
    },
    [buildings, history, isBuildingsControlled, onBuildingsChange]
  )

  const handleBuildingHeightChange = useCallback(
    (buildingId: string, height: number) => {
      // Start batch on first change
      if (!isDraggingHeightRef.current) {
        isDraggingHeightRef.current = true
        history?.beginBatch()
      }

      const newBuildings = buildings.map((b) =>
        b.id === buildingId ? { ...b, height } : b
      )

      if (history && !isBuildingsControlled) {
        history.setBuildings(newBuildings)
      } else if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)
    },
    [buildings, history, isBuildingsControlled, onBuildingsChange]
  )

  // End batch when mouse is released anywhere
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingHeightRef.current) {
        isDraggingHeightRef.current = false
        history?.endBatch()
      }
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [history])

  // Selection handler
  const handleSelectPolygon = useCallback(
    (polygonId: string | null) => {
      setSelectedPolygonId(polygonId)
      onSelectionChange?.(polygonId)
    },
    [onSelectionChange]
  )

  // Image dimensions handler
  const handleImageDimensionsChange = useCallback(
    (width: number) => {
      setImageWidth(width)
    },
    []
  )

  // Visibility handlers
  const handlePolygonVisibilityChange = useCallback(
    (polygonId: string, visible: boolean) => {
      const newPolygons = polygons.map((p) =>
        p.id === polygonId ? { ...p, visible } : p
      )

      if (history && !isPolygonsControlled) {
        history.setPolygons(newPolygons)
      } else if (!isPolygonsControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [polygons, history, isPolygonsControlled, onPolygonsChange]
  )

  const handleBuildingVisibilityChange = useCallback(
    (buildingId: string, visible: boolean) => {
      const newBuildings = buildings.map((b) =>
        b.id === buildingId ? { ...b, visible } : b
      )

      if (history && !isBuildingsControlled) {
        history.setBuildings(newBuildings)
      } else if (!isBuildingsControlled) {
        setInternalBuildings(newBuildings)
      }
      onBuildingsChange?.(newBuildings)
    },
    [buildings, history, isBuildingsControlled, onBuildingsChange]
  )

  const sidebar = !hideSidebar && (
    <div
      className="pv-roof-modeler-sidebar"
      style={{ width: sidebarWidth }}
    >
      <PolygonList
        polygons={polygons}
        buildings={buildings}
        selectedPolygonId={selectedPolygonId}
        pixelsPerMeter={pixelsPerMeter}
        imageWidth={imageWidth ?? undefined}
        onSelectPolygon={handleSelectPolygon}
        onDeletePolygon={handleDeletePolygon}
        onPolygonColorChange={handlePolygonColorChange}
        onPolygonVisibilityChange={handlePolygonVisibilityChange}
        onDeleteBuilding={handleDeleteBuilding}
        onBuildingColorChange={handleBuildingColorChange}
        onBuildingHeightChange={handleBuildingHeightChange}
        onBuildingVisibilityChange={handleBuildingVisibilityChange}
      />
    </div>
  )

  return (
    <div ref={containerRef} className="pv-roof-modeler" style={{ width, height }} tabIndex={-1}>
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
          pixelsPerMeter={pixelsPerMeter}
          historyContext={history || undefined}
          polygons={polygons}
          buildings={buildings}
          onPolygonsChange={handlePolygonsChange}
          onTimeOfDayChange={onTimeOfDayChange}
          onBuildingsChange={handleBuildingsChange}
          onImageLoad={onImageLoad}
          onImageDimensionsChange={handleImageDimensionsChange}
          onPixelsPerMeterChange={onPixelsPerMeterChange}
        />
      </div>
      {sidebarPosition === 'right' && sidebar}
    </div>
  )
}

export function PVRoofModeler(props: PVRoofModelerProps) {
  // If external history is provided or polygons are controlled, don't wrap with provider
  const hasExternalHistory = props.historyContext !== undefined
  const isControlled = props.polygons !== undefined

  if (hasExternalHistory || isControlled) {
    return <PVRoofModelerInner {...props} internalHistory={null} />
  }

  // Wrap with internal HistoryProvider for uncontrolled mode
  return (
    <HistoryProvider>
      <PVRoofModelerWithHistory {...props} />
    </HistoryProvider>
  )
}

function PVRoofModelerWithHistory(props: PVRoofModelerProps) {
  const history = useHistoryOptional()
  return <PVRoofModelerInner {...props} internalHistory={history} />
}
