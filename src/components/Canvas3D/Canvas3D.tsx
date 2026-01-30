import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { HistoryContextValue } from '../../hooks/useHistory'
import type { Polygon, Body, ToolName } from './types'
import { COLORS, PLANE_WIDTH } from './constants'
import { Scene } from './scene'
import { Toolbox, StatusBar, PolygonActions, MeasurePanel, TimeControl, CompassDisplay } from './ui'
import './Canvas3D.css'

// Re-export types for backwards compatibility
export type { Polygon, Body } from './types'

export interface Canvas3DProps {
  width?: number | string
  height?: number | string
  backgroundColor?: string
  gridSize?: number
  showGrid?: boolean
  outlineColor?: string
  polygons?: Polygon[]
  bodies?: Body[]
  /** Enable shadow casting for bodies (default: true) */
  shadows?: boolean
  /** Time of day in hours (0-24), affects sun position and shadows (default: 10) */
  timeOfDay?: number
  /** Show time of day slider control (default: false) */
  showTimeControl?: boolean
  /** Latitude for realistic sun position calculation (e.g., 52.2297 for Warsaw) */
  latitude?: number
  /** Longitude for realistic sun position calculation (e.g., 21.0122 for Warsaw) */
  longitude?: number
  /** Date for sun position calculation (default: current date) */
  date?: Date
  /** Pixels per meter ratio for scaling calculations */
  pixelsPerMeter?: number
  /** History context for undo/redo support */
  historyContext?: HistoryContextValue
  onImageLoad?: (file: File) => void
  onImageDimensionsChange?: (width: number, height: number) => void
  onPolygonsChange?: (polygons: Polygon[]) => void
  onBodiesChange?: (bodies: Body[]) => void
  onTimeOfDayChange?: (time: number) => void
  onPixelsPerMeterChange?: (pixelsPerMeter: number) => void
}

export function Canvas3D({
  width = '100%',
  height = 500,
  backgroundColor = '#1a1a2e',
  gridSize = 10,
  showGrid = true,
  outlineColor,
  shadows = true,
  timeOfDay: controlledTimeOfDay,
  showTimeControl = false,
  latitude,
  longitude,
  date,
  pixelsPerMeter: _pixelsPerMeter,
  historyContext,
  polygons: controlledPolygons,
  bodies: controlledBodies,
  onImageLoad,
  onImageDimensionsChange,
  onPolygonsChange,
  onBodiesChange,
  onTimeOfDayChange,
  onPixelsPerMeterChange: _onPixelsPerMeterChange,
}: Canvas3DProps) {
  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolName>('select')
  const [selectedLinePoints, setSelectedLinePoints] = useState<{
    polygonId: string
    pointIndex: number
  } | null>(null)
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([])
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([])
  const [knownLength, setKnownLength] = useState<number>(4.5)
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Polygon/Body state
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBodies, setInternalBodies] = useState<Body[]>([])
  const [isDraggingPoint, setIsDraggingPoint] = useState(false)

  // UI state
  const [compassRotation, setCompassRotation] = useState(0)
  const [internalTimeOfDay, setInternalTimeOfDay] = useState(10)

  const inputRef = useRef<HTMLInputElement>(null)
  const orbitControlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null)

  // Time of day can be controlled or uncontrolled
  const timeOfDay = controlledTimeOfDay !== undefined ? controlledTimeOfDay : internalTimeOfDay

  const handleTimeOfDayChange = useCallback((newTime: number) => {
    if (controlledTimeOfDay === undefined) {
      setInternalTimeOfDay(newTime)
    }
    onTimeOfDayChange?.(newTime)
  }, [controlledTimeOfDay, onTimeOfDayChange])

  // Support both controlled and uncontrolled modes
  const isControlled = controlledPolygons !== undefined
  const isBodiesControlled = controlledBodies !== undefined

  // Always render from internal state for smooth drag feedback
  const polygons = internalPolygons
  const bodies = isBodiesControlled ? controlledBodies : internalBodies

  // Sync internal state with controlled props (but not during drag)
  useEffect(() => {
    if (isControlled && !isDraggingPoint) {
      setInternalPolygons(controlledPolygons)
    }
  }, [isControlled, controlledPolygons, isDraggingPoint])

  useEffect(() => {
    if (isBodiesControlled) {
      setInternalBodies(controlledBodies)
    }
  }, [isBodiesControlled, controlledBodies])

  // Sync body points with polygon points when polygons change
  useEffect(() => {
    const currentBodies = isBodiesControlled ? controlledBodies : internalBodies
    if (currentBodies.length === 0) return

    const updatedBodies = currentBodies.map((body) => {
      const polygon = polygons.find((p) => p.id === body.polygonId)
      if (!polygon) return body

      const pointsChanged =
        polygon.points.length !== body.points.length ||
        polygon.points.some(
          (p, i) =>
            !body.points[i] ||
            p.x !== body.points[i].x ||
            p.y !== body.points[i].y ||
            p.z !== body.points[i].z
        )

      if (!pointsChanged) return body

      return {
        ...body,
        points: polygon.points.map((p) => p.clone()),
      }
    })

    const hasChanges = updatedBodies.some((b, i) => b !== currentBodies[i])
    if (hasChanges) {
      if (isBodiesControlled) {
        onBodiesChange?.(updatedBodies)
      } else {
        setInternalBodies(updatedBodies)
      }
    }
  }, [polygons, internalBodies, controlledBodies, isBodiesControlled, onBodiesChange])

  const setPolygons = useCallback(
    (newPolygons: Polygon[]) => {
      if (!isControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [isControlled, onPolygonsChange]
  )

  const setBodies = useCallback(
    (newBodies: Body[]) => {
      if (!isBodiesControlled) {
        setInternalBodies(newBodies)
      }
      onBodiesChange?.(newBodies)
    },
    [isBodiesControlled, onBodiesChange]
  )

  // Tool flags
  const isAddingPolygon = activeTool === 'polygon'
  const isAddingLine = activeTool === 'line'
  const isAddingBody = activeTool === 'body'
  const isMeasuring = activeTool === 'measure'

  const currentColor = outlineColor || COLORS[polygons.length % COLORS.length]

  // Calculate pixels per meter
  const calculatedPixelsPerMeter = useMemo(() => {
    if (measurePoints.length !== 2 || !imageWidth || knownLength <= 0) return null
    const distanceInUnits = measurePoints[0].distanceTo(measurePoints[1])
    const distanceInPixels = distanceInUnits * (imageWidth / PLANE_WIDTH)
    return distanceInPixels / knownLength
  }, [measurePoints, imageWidth, knownLength])

  // File handling
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return

      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        setAspectRatio(img.width / img.height)
        setImageWidth(img.width)
        setImageUrl(url)
        onImageLoad?.(file)
        onImageDimensionsChange?.(img.width, img.height)
      }
      img.src = url
    },
    [onImageLoad, onImageDimensionsChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleContainerClick = useCallback(() => {
    if (!imageUrl) {
      inputRef.current?.click()
    }
  }, [imageUrl])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (imageUrl) {
      e.preventDefault()
    }
  }, [imageUrl])

  // Tool handlers
  const handleSelectTool = useCallback((tool: ToolName) => {
    if (activeTool === 'polygon' && currentPoints.length > 0) {
      setCurrentPoints([])
    }
    if (activeTool === 'measure') {
      setMeasurePoints([])
    }
    setSelectedLinePoints(null)
    setActiveTool(tool)
  }, [activeTool, currentPoints.length])

  // Polygon tool handlers
  const handlePlaneClick = useCallback((point: THREE.Vector3) => {
    setCurrentPoints((prev) => [...prev, point])
  }, [])

  const handleFinishPolygon = useCallback(() => {
    if (currentPoints.length >= 3) {
      historyContext?.takeSnapshot()
      const newPolygon: Polygon = {
        id: crypto.randomUUID(),
        points: currentPoints,
        color: currentColor,
        lines: [],
      }
      setPolygons([...polygons, newPolygon])
    }
    setCurrentPoints([])
    setActiveTool('select')
  }, [currentPoints, currentColor, polygons, setPolygons, historyContext])

  const handleCancelDrawing = useCallback(() => {
    setCurrentPoints([])
    setActiveTool('select')
    setSelectedLinePoints(null)
  }, [])

  const handleUndoPoint = useCallback(() => {
    setCurrentPoints((prev) => prev.slice(0, -1))
  }, [])

  // Point drag handlers
  const handlePointDragStart = useCallback(() => {
    setIsDraggingPoint(true)
    historyContext?.beginBatch()
  }, [historyContext])

  const handlePointDrag = useCallback(
    (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => {
      setInternalPolygons((prev) =>
        prev.map((p) => {
          if (p.id !== polygonId) return p
          const newPoints = [...p.points]
          newPoints[pointIndex] = newPosition
          return { ...p, points: newPoints }
        })
      )
    },
    []
  )

  const handlePointDragEnd = useCallback(() => {
    setIsDraggingPoint(false)
    historyContext?.endBatch()
    onPolygonsChange?.(internalPolygons)
  }, [internalPolygons, onPolygonsChange, historyContext])

  const handlePointDelete = useCallback(
    (polygonId: string, pointIndex: number) => {
      const polygon = polygons.find(p => p.id === polygonId)
      if (!polygon || polygon.points.length <= 3) return

      historyContext?.takeSnapshot()
      const newPolygons = polygons.map((p) => {
        if (p.id !== polygonId) return p
        const newPoints = [...p.points]
        newPoints.splice(pointIndex, 1)
        const newLines = (p.lines || [])
          .filter(([a, b]) => a !== pointIndex && b !== pointIndex)
          .map(([a, b]) => [
            a > pointIndex ? a - 1 : a,
            b > pointIndex ? b - 1 : b,
          ] as [number, number])
        return { ...p, points: newPoints, lines: newLines }
      })
      setPolygons(newPolygons)
    },
    [polygons, setPolygons, historyContext]
  )

  const handleAddPointOnEdge = useCallback(
    (polygonId: string, edgeIndex: number, position: THREE.Vector3) => {
      historyContext?.takeSnapshot()
      const newPolygons = polygons.map((p) => {
        if (p.id !== polygonId) return p
        const newPoints = [...p.points]
        newPoints.splice(edgeIndex + 1, 0, position)
        const newLines = (p.lines || []).map(([a, b]) => [
          a > edgeIndex ? a + 1 : a,
          b > edgeIndex ? b + 1 : b,
        ] as [number, number])
        return { ...p, points: newPoints, lines: newLines }
      })
      setPolygons(newPolygons)
    },
    [polygons, setPolygons, historyContext]
  )

  // Line tool handlers
  const handlePointSelect = useCallback(
    (polygonId: string, pointIndex: number) => {
      if (!selectedLinePoints) {
        setSelectedLinePoints({ polygonId, pointIndex })
      } else if (selectedLinePoints.polygonId === polygonId) {
        if (selectedLinePoints.pointIndex !== pointIndex) {
          const polygon = polygons.find((p) => p.id === polygonId)
          if (polygon) {
            const lineExists = polygon.lines?.some(
              ([a, b]) =>
                (a === selectedLinePoints.pointIndex && b === pointIndex) ||
                (a === pointIndex && b === selectedLinePoints.pointIndex)
            )

            const isEdge =
              Math.abs(selectedLinePoints.pointIndex - pointIndex) === 1 ||
              (selectedLinePoints.pointIndex === 0 && pointIndex === polygon.points.length - 1) ||
              (pointIndex === 0 && selectedLinePoints.pointIndex === polygon.points.length - 1)

            if (!lineExists && !isEdge) {
              historyContext?.takeSnapshot()
              const newPolygons = polygons.map((p) => {
                if (p.id !== polygonId) return p
                const newLines = [...(p.lines || []), [selectedLinePoints.pointIndex, pointIndex] as [number, number]]
                return { ...p, lines: newLines }
              })
              setPolygons(newPolygons)
            }
          }
        }
        setSelectedLinePoints(null)
      } else {
        setSelectedLinePoints({ polygonId, pointIndex })
      }
    },
    [selectedLinePoints, polygons, setPolygons, historyContext]
  )

  // Body tool handlers
  const handlePolygonClick = useCallback(
    (polygonId: string) => {
      if (!isAddingBody) return

      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon) return

      const existingBody = bodies.find((b) => b.polygonId === polygonId)
      if (existingBody) return

      const newBody: Body = {
        id: crypto.randomUUID(),
        polygonId: polygon.id,
        points: polygon.points.map((p) => p.clone()),
        height: 0.5,
        color: polygon.color,
      }

      setBodies([...bodies, newBody])
    },
    [isAddingBody, polygons, bodies, setBodies]
  )

  const handleDeleteBody = useCallback(
    (bodyId: string) => {
      setBodies(bodies.filter((b) => b.id !== bodyId))
    },
    [bodies, setBodies]
  )

  // Measure tool handlers
  const handleMeasureClick = useCallback(
    (point: THREE.Vector3) => {
      if (measurePoints.length < 2) {
        setMeasurePoints((prev) => [...prev, point])
      } else {
        setMeasurePoints([point])
      }
    },
    [measurePoints.length]
  )

  const handleCopyPixelsPerMeter = useCallback(() => {
    if (calculatedPixelsPerMeter === null) return

    const value = calculatedPixelsPerMeter.toFixed(2)
    navigator.clipboard.writeText(value).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 1500)
    })
  }, [calculatedPixelsPerMeter])

  const handleClearMeasurement = useCallback(() => {
    setMeasurePoints([])
  }, [])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool === 'polygon' && currentPoints.length > 0) {
          setCurrentPoints([])
        }
        if (activeTool === 'measure') {
          setMeasurePoints([])
        }
        setSelectedLinePoints(null)
        setActiveTool('select')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, currentPoints.length])

  // Status text
  const getStatusText = (): string | null => {
    if (isAddingPolygon) {
      return currentPoints.length === 0
        ? 'Click to place points'
        : `${currentPoints.length} points${currentPoints.length >= 3 ? ' • Click first point to close' : ''}`
    }
    if (isAddingLine) {
      return selectedLinePoints
        ? 'Click another point to create a line'
        : 'Click on a point to start a line'
    }
    if (isAddingBody) {
      return 'Click on a polygon to create a 3D body • Right-click body to delete'
    }
    if (isMeasuring) {
      if (measurePoints.length === 0) return 'Click to place first point on a known object'
      if (measurePoints.length === 1) return 'Click to place second point'
      return 'Measurement complete • Adjust known length below'
    }
    return null
  }

  return (
    <div
      className={`canvas3d-container ${isDragging ? 'canvas3d-dragging' : ''}`}
      style={{ width, height }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="canvas3d-input"
      />

      {!imageUrl && (
        <div className="canvas3d-placeholder">
          <span>Drop an image here or click to upload</span>
        </div>
      )}

      <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows={shadows}>
        <Scene
          imageUrl={imageUrl}
          aspectRatio={aspectRatio}
          showGrid={showGrid}
          gridSize={gridSize}
          backgroundColor={backgroundColor}
          shadows={shadows}
          timeOfDay={timeOfDay}
          latitude={latitude}
          longitude={longitude}
          date={date}
          isAddingPolygon={isAddingPolygon}
          isAddingLine={isAddingLine}
          isAddingBody={isAddingBody}
          isMeasuring={isMeasuring}
          measurePoints={measurePoints}
          selectedLinePoints={selectedLinePoints}
          polygons={polygons}
          bodies={bodies}
          currentPoints={currentPoints}
          currentColor={currentColor}
          onPlaneClick={handlePlaneClick}
          onMeasureClick={handleMeasureClick}
          onPointDragStart={handlePointDragStart}
          onPointDrag={handlePointDrag}
          onPointDragEnd={handlePointDragEnd}
          onPointDelete={handlePointDelete}
          onAddPointOnEdge={handleAddPointOnEdge}
          onPointSelect={handlePointSelect}
          onClosePolygon={handleFinishPolygon}
          onPolygonClick={handlePolygonClick}
          onDeleteBody={handleDeleteBody}
          orbitControlsRef={orbitControlsRef}
          isDraggingPoint={isDraggingPoint}
          onCompassRotationChange={setCompassRotation}
        />
      </Canvas>

      {imageUrl && (
        <div className="canvas3d-top-right">
          {showTimeControl && (
            <TimeControl
              timeOfDay={timeOfDay}
              onTimeChange={handleTimeOfDayChange}
            />
          )}
          <CompassDisplay rotation={compassRotation} />
        </div>
      )}

      {imageUrl && (
        <Toolbox
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          polygonsCount={polygons.length}
          historyContext={historyContext}
        />
      )}

      {isAddingPolygon && (
        <PolygonActions
          canUndo={currentPoints.length > 0}
          canFinish={currentPoints.length >= 3}
          onUndo={handleUndoPoint}
          onFinish={handleFinishPolygon}
          onCancel={handleCancelDrawing}
        />
      )}

      <StatusBar text={getStatusText()} />

      {isMeasuring && (
        <MeasurePanel
          show={measurePoints.length === 2}
          knownLength={knownLength}
          calculatedPixelsPerMeter={calculatedPixelsPerMeter}
          copyFeedback={copyFeedback}
          onKnownLengthChange={setKnownLength}
          onCopy={handleCopyPixelsPerMeter}
          onClear={handleClearMeasurement}
        />
      )}
    </div>
  )
}
