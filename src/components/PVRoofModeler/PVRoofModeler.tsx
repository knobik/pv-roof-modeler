import { useState, useCallback, useEffect, useRef } from 'react'
import { Canvas3D } from '../Canvas3D'
import type { Canvas3DProps, Polygon, Body } from '../Canvas3D'
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
  /** Controlled bodies array */
  bodies?: Body[]
  /** External history context (for controlled mode with external history management) */
  historyContext?: HistoryContextValue
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
  /** Callback when pixels per meter is calculated via measurement tool */
  onPixelsPerMeterChange?: (pixelsPerMeter: number) => void
}

interface PVRoofModelerInnerProps extends PVRoofModelerProps {
  internalHistory: HistoryContextValue | null
}

function PVRoofModelerInner({
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
  pixelsPerMeter,
  sidebarWidth = 280,
  sidebarPosition = 'right',
  hideSidebar = false,
  polygons: controlledPolygons,
  bodies: controlledBodies,
  historyContext: externalHistory,
  onPolygonsChange,
  onBodiesChange,
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
  const isBodiesControlled = controlledBodies !== undefined

  // Internal state for uncontrolled mode without history
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBodies, setInternalBodies] = useState<Body[]>([])

  // Track if we're currently dragging height slider for batch operations
  const isDraggingHeightRef = useRef(false)

  // Determine which state to use
  const polygons = isPolygonsControlled
    ? controlledPolygons
    : history
      ? history.state.polygons
      : internalPolygons

  const bodies = isBodiesControlled
    ? controlledBodies
    : history
      ? history.state.bodies
      : internalBodies

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
      const newBodies = bodies.filter((b) => b.polygonId !== polygonId)

      if (history && !isPolygonsControlled) {
        history.setPolygons(newPolygons)
      } else if (!isPolygonsControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)

      if (history && !isBodiesControlled) {
        history.setBodies(newBodies)
      } else if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)

      if (selectedPolygonId === polygonId) {
        setSelectedPolygonId(null)
        onSelectionChange?.(null)
      }
    },
    [polygons, bodies, history, isPolygonsControlled, isBodiesControlled, selectedPolygonId, onPolygonsChange, onBodiesChange, onSelectionChange]
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

  // Body handlers
  const handleBodiesChange = useCallback(
    (newBodies: Body[]) => {
      if (history && !isBodiesControlled) {
        history.setBodies(newBodies)
      } else if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [history, isBodiesControlled, onBodiesChange]
  )

  const handleDeleteBody = useCallback(
    (bodyId: string) => {
      history?.takeSnapshot()

      const newBodies = bodies.filter((b) => b.id !== bodyId)

      if (history && !isBodiesControlled) {
        history.setBodies(newBodies)
      } else if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [bodies, history, isBodiesControlled, onBodiesChange]
  )

  const handleBodyColorChange = useCallback(
    (bodyId: string, color: string) => {
      history?.takeSnapshot()

      const newBodies = bodies.map((b) =>
        b.id === bodyId ? { ...b, color } : b
      )

      if (history && !isBodiesControlled) {
        history.setBodies(newBodies)
      } else if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [bodies, history, isBodiesControlled, onBodiesChange]
  )

  const handleBodyHeightChange = useCallback(
    (bodyId: string, height: number) => {
      // Start batch on first change
      if (!isDraggingHeightRef.current) {
        isDraggingHeightRef.current = true
        history?.beginBatch()
      }

      const newBodies = bodies.map((b) =>
        b.id === bodyId ? { ...b, height } : b
      )

      if (history && !isBodiesControlled) {
        history.setBodies(newBodies)
      } else if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [bodies, history, isBodiesControlled, onBodiesChange]
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

  const handleBodyVisibilityChange = useCallback(
    (bodyId: string, visible: boolean) => {
      const newBodies = bodies.map((b) =>
        b.id === bodyId ? { ...b, visible } : b
      )

      if (history && !isBodiesControlled) {
        history.setBodies(newBodies)
      } else if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [bodies, history, isBodiesControlled, onBodiesChange]
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
        pixelsPerMeter={pixelsPerMeter}
        imageWidth={imageWidth ?? undefined}
        onSelectPolygon={handleSelectPolygon}
        onDeletePolygon={handleDeletePolygon}
        onPolygonColorChange={handlePolygonColorChange}
        onPolygonVisibilityChange={handlePolygonVisibilityChange}
        onDeleteBody={handleDeleteBody}
        onBodyColorChange={handleBodyColorChange}
        onBodyHeightChange={handleBodyHeightChange}
        onBodyVisibilityChange={handleBodyVisibilityChange}
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
          bodies={bodies}
          onPolygonsChange={handlePolygonsChange}
          onTimeOfDayChange={onTimeOfDayChange}
          onBodiesChange={handleBodiesChange}
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
