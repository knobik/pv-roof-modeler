import { useMemo } from 'react'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Polygon } from '../types'
import { SunLight } from './SunLight'
import { ImagePlane } from './ImagePlane'
import { GridHelper } from './GridHelper'
import { Compass } from './Compass'
import { PolygonOutlines } from './PolygonOutlines'
import { ScaledPoint } from '../primitives'

export interface SceneProps {
  imageUrl: string | null
  aspectRatio: number
  showGrid: boolean
  gridSize: number
  backgroundColor: string
  shadows: boolean
  timeOfDay: number
  latitude?: number
  longitude?: number
  date?: Date
  isAddingPolygon: boolean
  isPerpendicular: boolean
  isCalibrating: boolean
  isMeasuring: boolean
  calibrationPoints: THREE.Vector3[]
  measurementPoints: THREE.Vector3[]
  perpendicularPreview: { polygonId: string; pointIndex: number; previewPoints: THREE.Vector3[] } | null
  polygons: Polygon[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  pixelsPerMeter: number | null
  imageWidth: number | null
  planeWidth: number
  onPlaneClick: (point: THREE.Vector3) => void
  onCalibrationClick: (point: THREE.Vector3) => void
  onMeasurementClick: (point: THREE.Vector3) => void
  onPointDragStart: () => void
  onPointDrag: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => void
  onPointDragEnd: () => void
  onPointDelete: (polygonId: string, pointIndex: number) => void
  onAddPointOnEdge: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void
  onPointSelect: (polygonId: string, pointIndex: number) => void
  onClosePolygon: () => void
  orbitControlsRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>
  isDraggingPoint: boolean
  onCompassRotationChange: (angle: number) => void
}

export function Scene({
  imageUrl,
  aspectRatio,
  showGrid,
  gridSize,
  backgroundColor,
  shadows,
  timeOfDay,
  latitude,
  longitude,
  date,
  isAddingPolygon,
  isPerpendicular,
  isCalibrating,
  isMeasuring,
  calibrationPoints,
  measurementPoints,
  perpendicularPreview,
  polygons,
  currentPoints,
  currentColor,
  pixelsPerMeter,
  imageWidth,
  planeWidth,
  onPlaneClick,
  onCalibrationClick,
  onMeasurementClick,
  onPointDragStart,
  onPointDrag,
  onPointDragEnd,
  onPointDelete,
  onAddPointOnEdge,
  onPointSelect,
  onClosePolygon,
  orbitControlsRef,
  isDraggingPoint,
  onCompassRotationChange,
}: SceneProps) {
  const orbitEnabled = !isAddingPolygon && !isPerpendicular && !isCalibrating && !isMeasuring && !isDraggingPoint

  // Ambient light intensity adjusts based on time of day
  const ambientIntensity = useMemo(() => {
    const time = ((timeOfDay % 24) + 24) % 24
    if (time < 6 || time > 18) return 0.3 // Night
    return 0.4 + Math.sin(((time - 6) / 12) * Math.PI) * 0.3
  }, [timeOfDay])

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={ambientIntensity} />
      <SunLight timeOfDay={timeOfDay} shadows={shadows} latitude={latitude} longitude={longitude} date={date} />
      <Compass onRotationChange={onCompassRotationChange} />

      {showGrid && <GridHelper size={gridSize} />}
      <ImagePlane
        textureUrl={imageUrl}
        aspectRatio={aspectRatio}
        isAddingPolygon={isAddingPolygon}
        isCalibrating={isCalibrating}
        isMeasuring={isMeasuring}
        receiveShadow={shadows}
        onPlaneClick={onPlaneClick}
        onCalibrationClick={onCalibrationClick}
        onMeasurementClick={onMeasurementClick}
      />
      {/* Calibration line */}
      {calibrationPoints.length >= 1 && (
        <>
          {calibrationPoints.map((point, i) => (
            <ScaledPoint
              key={`calibration-point-${i}`}
              position={point}
              color="#ffaa00"
            />
          ))}
          {calibrationPoints.length === 2 && (
            <Line
              points={calibrationPoints}
              color="#ffaa00"
              lineWidth={3}
            />
          )}
        </>
      )}
      {/* Measurement line */}
      {measurementPoints.length >= 1 && (
        <MeasurementLine measurementPoints={measurementPoints} />
      )}
      <PolygonOutlines
        polygons={polygons}
        currentPoints={currentPoints}
        currentColor={currentColor}
        isPerpendicular={isPerpendicular}
        perpendicularPreview={perpendicularPreview}
        pixelsPerMeter={pixelsPerMeter}
        imageWidth={imageWidth}
        planeWidth={planeWidth}
        onPointDragStart={onPointDragStart}
        onPointDrag={onPointDrag}
        onPointDragEnd={onPointDragEnd}
        onPointDelete={onPointDelete}
        onAddPointOnEdge={onAddPointOnEdge}
        onPointSelect={onPointSelect}
        onClosePolygon={onClosePolygon}
      />

      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.05}
        enabled={orbitEnabled}
      />
    </>
  )
}

interface MeasurementLineProps {
  measurementPoints: THREE.Vector3[]
}

function MeasurementLine({ measurementPoints }: MeasurementLineProps) {
  return (
    <>
      {measurementPoints.map((point, i) => (
        <ScaledPoint
          key={`measurement-point-${i}`}
          position={point}
          color="#00aaff"
        />
      ))}
      {measurementPoints.length === 2 && (
        <Line
          points={measurementPoints}
          color="#00aaff"
          lineWidth={3}
        />
      )}
    </>
  )
}
