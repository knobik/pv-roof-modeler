import { useMemo } from 'react'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Polygon, Body } from '../types'
import { SunLight } from './SunLight'
import { ImagePlane } from './ImagePlane'
import { GridHelper } from './GridHelper'
import { Compass } from './Compass'
import { BuildingBodies } from './BuildingBodies'
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
  isAddingLine: boolean
  isAddingBody: boolean
  isCalibrating: boolean
  calibrationPoints: THREE.Vector3[]
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  polygons: Polygon[]
  bodies: Body[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  pixelsPerMeter: number | null
  imageWidth: number | null
  planeWidth: number
  onPlaneClick: (point: THREE.Vector3) => void
  onCalibrationClick: (point: THREE.Vector3) => void
  onPointDragStart: () => void
  onPointDrag: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => void
  onPointDragEnd: () => void
  onPointDelete: (polygonId: string, pointIndex: number) => void
  onAddPointOnEdge: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void
  onPointSelect: (polygonId: string, pointIndex: number) => void
  onClosePolygon: () => void
  onPolygonClick: (polygonId: string) => void
  onDeleteBody: (bodyId: string) => void
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
  isAddingLine,
  isAddingBody,
  isCalibrating,
  calibrationPoints,
  selectedLinePoints,
  polygons,
  bodies,
  currentPoints,
  currentColor,
  pixelsPerMeter,
  imageWidth,
  planeWidth,
  onPlaneClick,
  onCalibrationClick,
  onPointDragStart,
  onPointDrag,
  onPointDragEnd,
  onPointDelete,
  onAddPointOnEdge,
  onPointSelect,
  onClosePolygon,
  onPolygonClick,
  onDeleteBody,
  orbitControlsRef,
  isDraggingPoint,
  onCompassRotationChange,
}: SceneProps) {
  const orbitEnabled = !isAddingPolygon && !isAddingLine && !isAddingBody && !isCalibrating && !isDraggingPoint

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
        receiveShadow={shadows}
        onPlaneClick={onPlaneClick}
        onCalibrationClick={onCalibrationClick}
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
      <BuildingBodies
        bodies={bodies}
        isAddingBody={isAddingBody}
        imageUrl={imageUrl}
        aspectRatio={aspectRatio}
        castShadow={shadows}
        onDeleteBody={onDeleteBody}
      />
      <PolygonOutlines
        polygons={polygons}
        currentPoints={currentPoints}
        currentColor={currentColor}
        isAddingLine={isAddingLine}
        isAddingBody={isAddingBody}
        selectedLinePoints={selectedLinePoints}
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
        onPolygonClick={onPolygonClick}
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
