import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Polygon } from '../types'
import { DraggablePoint, ClickableEdge, ClosingPoint, ScaledPoint, PolygonFill, EdgeLabel } from '../primitives'

export interface PolygonOutlinesProps {
  polygons: Polygon[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  isAddingLine: boolean
  isAddingBuilding: boolean
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  pixelsPerMeter: number | null
  imageWidth: number | null
  planeWidth: number
  onPointDragStart: () => void
  onPointDrag: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => void
  onPointDragEnd: () => void
  onPointDelete: (polygonId: string, pointIndex: number) => void
  onAddPointOnEdge: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void
  onPointSelect: (polygonId: string, pointIndex: number) => void
  onClosePolygon: () => void
  onPolygonClick: (polygonId: string) => void
}

export function PolygonOutlines({
  polygons,
  currentPoints,
  currentColor,
  isAddingLine,
  isAddingBuilding,
  selectedLinePoints,
  pixelsPerMeter,
  imageWidth,
  planeWidth,
  onPointDragStart,
  onPointDrag,
  onPointDragEnd,
  onPointDelete,
  onAddPointOnEdge,
  onPointSelect,
  onClosePolygon,
  onPolygonClick,
}: PolygonOutlinesProps) {
  const canClose = currentPoints.length >= 3
  const showEdgeLabels = pixelsPerMeter !== null && imageWidth !== null

  return (
    <>
      {polygons.map((polygon) => {
        // Skip hidden polygons
        if (polygon.visible === false) return null

        const canDeletePoints = polygon.points.length > 3

        return (
          <group key={polygon.id}>
            {/* Clickable polygon fill for building tool */}
            {isAddingBuilding && polygon.points.length >= 3 && (
              <PolygonFill
                points={polygon.points}
                color={polygon.color}
                onClick={() => onPolygonClick(polygon.id)}
              />
            )}
            {/* Outline */}
            {polygon.points.length >= 2 && (
              <Line
                points={[...polygon.points, polygon.points[0]]}
                color={polygon.color}
                lineWidth={2}
              />
            )}
            {/* Edge length labels */}
            {showEdgeLabels && polygon.points.length >= 2 && (() => {
              // Calculate polygon centroid for determining outside direction
              const centroid = new THREE.Vector3()
              polygon.points.forEach(p => centroid.add(p))
              centroid.divideScalar(polygon.points.length)

              return polygon.points.map((point, i) => {
                const nextIndex = (i + 1) % polygon.points.length
                const nextPoint = polygon.points[nextIndex]
                return (
                  <EdgeLabel
                    key={`edge-label-${polygon.id}-${i}`}
                    start={point}
                    end={nextPoint}
                    polygonCentroid={centroid}
                    pixelsPerMeter={pixelsPerMeter!}
                    imageWidth={imageWidth!}
                    planeWidth={planeWidth}
                    color={polygon.color}
                  />
                )
              })
            })()}
            {/* Internal lines */}
            {polygon.lines?.map(([startIdx, endIdx], lineIndex) => (
              <Line
                key={`line-${polygon.id}-${lineIndex}`}
                points={[polygon.points[startIdx], polygon.points[endIdx]]}
                color={polygon.color}
                lineWidth={2}
              />
            ))}
            {polygon.points.map((point, i) => {
              const nextIndex = (i + 1) % polygon.points.length
              const nextPoint = polygon.points[nextIndex]
              const isSelected =
                selectedLinePoints?.polygonId === polygon.id &&
                selectedLinePoints?.pointIndex === i

              return (
                <group key={`${polygon.id}-${i}`}>
                  <DraggablePoint
                    position={point}
                    color={polygon.color}
                    canDelete={canDeletePoints}
                    isSelectMode={isAddingLine}
                    isSelected={isSelected}
                    onDragStart={onPointDragStart}
                    onDrag={(newPos) => onPointDrag(polygon.id, i, newPos)}
                    onDragEnd={onPointDragEnd}
                    onDelete={() => onPointDelete(polygon.id, i)}
                    onSelect={() => onPointSelect(polygon.id, i)}
                  />
                  {!isAddingLine && !isAddingBuilding && (
                    <ClickableEdge
                      start={point}
                      end={nextPoint}
                      allPoints={polygon.points}
                      onAddPoint={(pos) => onAddPointOnEdge(polygon.id, i, pos)}
                    />
                  )}
                </group>
              )
            })}
          </group>
        )
      })}

      {currentPoints.length >= 2 && (
        <Line points={currentPoints} color={currentColor} lineWidth={2} />
      )}
      {currentPoints.map((point, i) =>
        i === 0 ? (
          <ClosingPoint
            key={`current-${i}`}
            position={point}
            color={currentColor}
            canClose={canClose}
            onClose={onClosePolygon}
          />
        ) : (
          <ScaledPoint
            key={`current-${i}`}
            position={point}
            color={currentColor}
          />
        )
      )}
    </>
  )
}
