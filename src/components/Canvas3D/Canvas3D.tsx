import { useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { HistoryContextValue } from '../../hooks/useHistory'
import type { Polygon, Building } from './types'
import { Scene } from './scene'
import { Toolbox, StatusBar, PolygonActions, CalibrationPanel, MeasurementPanel, TimeControl, CompassDisplay } from './ui'
import { CanvasProvider, useCanvasContext, ToolProvider } from './context'
import { useToolManager } from './tools'
import './Canvas3D.css'

// Re-export types for backwards compatibility
export type { Polygon, Building } from './types'

export interface Canvas3DProps {
  width?: number | string
  height?: number | string
  backgroundColor?: string
  gridSize?: number
  showGrid?: boolean
  outlineColor?: string
  polygons?: Polygon[]
  buildings?: Building[]
  /** Enable shadow casting for buildings (default: true) */
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
  onBuildingsChange?: (buildings: Building[]) => void
  onTimeOfDayChange?: (time: number) => void
  onPixelsPerMeterChange?: (pixelsPerMeter: number) => void
}

export function Canvas3D(props: Canvas3DProps) {
  const {
    polygons: controlledPolygons,
    buildings: controlledBuildings,
    historyContext,
    pixelsPerMeter,
    onPolygonsChange,
    onBuildingsChange,
    ...restProps
  } = props

  return (
    <CanvasProvider
      controlledPolygons={controlledPolygons}
      controlledBuildings={controlledBuildings}
      historyContext={historyContext}
      pixelsPerMeter={pixelsPerMeter}
      onPolygonsChange={onPolygonsChange}
      onBuildingsChange={onBuildingsChange}
    >
      <ToolProvider>
        <Canvas3DInner {...restProps} historyContext={historyContext} />
      </ToolProvider>
    </CanvasProvider>
  )
}

interface Canvas3DInnerProps extends Omit<Canvas3DProps, 'polygons' | 'bodies' | 'pixelsPerMeter' | 'onPolygonsChange' | 'onBodiesChange'> {}

function Canvas3DInner({
  width = '100%',
  height = 500,
  backgroundColor = '#e8e8f0',
  gridSize = 10,
  showGrid = true,
  outlineColor,
  shadows = true,
  timeOfDay: controlledTimeOfDay,
  showTimeControl = false,
  latitude,
  longitude,
  date,
  historyContext,
  onImageLoad,
  onImageDimensionsChange,
  onTimeOfDayChange,
}: Canvas3DInnerProps) {
  // Get canvas context
  const {
    imageUrl,
    setImageUrl,
    aspectRatio,
    setAspectRatio,
    setImageWidth,
    imageWidth,
    polygons,
    buildings,
    isDraggingPoint,
    pixelsPerMeter,
    planeWidth,
  } = useCanvasContext()

  // Get tool manager
  const toolManager = useToolManager()

  // Derive tool flags from active tool
  const isAddingPolygon = toolManager.activeTool === 'polygon'
  const isAddingLine = toolManager.activeTool === 'line'
  const isAddingBuilding = toolManager.activeTool === 'building'
  const isPerpendicular = toolManager.activeTool === 'perpendicular'
  const isCalibrating = toolManager.activeTool === 'calibration'
  const isMeasuring = toolManager.activeTool === 'measurement'

  // Local UI state
  const [isDragging, setIsDragging] = useState(false)
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

  // Use outline color prop or tool manager's calculated color
  const currentColor = outlineColor || toolManager.currentColor

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
    [setImageUrl, setAspectRatio, setImageWidth, onImageLoad, onImageDimensionsChange]
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

  // Get handlers from tool manager (properly typed now)
  const handlers = toolManager.handlers

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
          isAddingBuilding={isAddingBuilding}
          isPerpendicular={isPerpendicular}
          isCalibrating={isCalibrating}
          isMeasuring={isMeasuring}
          calibrationPoints={toolManager.calibrationPoints}
          measurementPoints={toolManager.measurementPoints}
          selectedLinePoints={toolManager.selectedLinePoints}
          perpendicularPreview={
            toolManager.perpendicularTool.state.selectedVertexInfo &&
            toolManager.perpendicularTool.state.previewPoints
              ? {
                  polygonId: toolManager.perpendicularTool.state.selectedVertexInfo.polygonId,
                  pointIndex: toolManager.perpendicularTool.state.selectedVertexInfo.pointIndex,
                  previewPoints: toolManager.perpendicularTool.state.previewPoints,
                }
              : null
          }
          polygons={polygons}
          buildings={buildings}
          currentPoints={toolManager.currentPoints}
          currentColor={currentColor}
          pixelsPerMeter={pixelsPerMeter}
          imageWidth={imageWidth}
          planeWidth={planeWidth}
          onPlaneClick={handlers.onPlaneClick!}
          onCalibrationClick={handlers.onPlaneClick!}
          onMeasurementClick={handlers.onPlaneClick!}
          onPointDragStart={handlers.onPointDragStart!}
          onPointDrag={handlers.onPointDrag!}
          onPointDragEnd={handlers.onPointDragEnd!}
          onPointDelete={handlers.onPointDelete!}
          onAddPointOnEdge={handlers.onEdgeClick!}
          onPointSelect={handlers.onPointClick!}
          onClosePolygon={toolManager.polygonTool.handleFinishPolygon}
          onPolygonClick={handlers.onPolygonClick!}
          onDeleteBuilding={handlers.onBuildingClick!}
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
          activeTool={toolManager.activeTool}
          onSelectTool={toolManager.setActiveTool}
          polygonsCount={polygons.length}
          historyContext={historyContext}
        />
      )}

      {isAddingPolygon && (
        <PolygonActions
          canUndo={toolManager.currentPoints.length > 0}
          canFinish={toolManager.currentPoints.length >= 3}
          onUndo={toolManager.polygonTool.handleUndoPoint}
          onFinish={toolManager.polygonTool.handleFinishPolygon}
          onCancel={handlers.onCancel!}
        />
      )}

      <StatusBar text={toolManager.statusText} />

      {isCalibrating && (
        <CalibrationPanel
          show={toolManager.calibrationPoints.length === 2}
          knownLength={toolManager.calibrationTool.state.knownLength}
          calculatedPixelsPerMeter={toolManager.calibrationTool.state.calculatedPixelsPerMeter}
          copyFeedback={toolManager.calibrationTool.state.copyFeedback}
          onKnownLengthChange={toolManager.calibrationTool.setKnownLength}
          onCopy={toolManager.calibrationTool.handleCopyPixelsPerMeter}
          onClear={toolManager.calibrationTool.handleClearCalibration}
        />
      )}

      {isMeasuring && (
        <MeasurementPanel
          show={toolManager.measurementTool.state.showPanel}
          measuredDistance={toolManager.measurementTool.state.measuredDistance}
          copyFeedback={toolManager.measurementTool.state.copyFeedback}
          onCopy={toolManager.measurementTool.handleCopyMeasurement}
          onClear={toolManager.measurementTool.handleClearMeasurement}
        />
      )}
    </div>
  )
}
