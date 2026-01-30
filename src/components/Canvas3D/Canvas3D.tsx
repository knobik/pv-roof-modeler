import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import SunCalc from 'suncalc'
import type { HistoryContextValue } from '../../hooks/useHistory'
import './Canvas3D.css'

export interface Polygon {
  id: string
  points: THREE.Vector3[]
  color: string
  lines: [number, number][]  // pairs of point indices that form internal lines
  visible?: boolean  // whether the polygon is visible in the editor (default: true)
}

export interface Body {
  id: string
  polygonId: string  // reference to source polygon
  points: THREE.Vector3[]  // base points (from polygon)
  height: number
  color: string
  visible?: boolean  // whether the body is visible in the editor (default: true)
}

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

const OUTLINE_HEIGHT = 0.01
const POINT_SIZE = 0.05
const POINT_SIZE_HOVER = 0.07

// Simple sun position calculation (fallback when no coordinates provided)
// Coordinate system: -Z is north, +X is east, +Z is south, -X is west
function getSimpleSunPosition(timeOfDay: number): [number, number, number] {
  // Normalize time to 0-24 range
  const time = ((timeOfDay % 24) + 24) % 24

  // Sun arc: rises at 6, peaks at 12, sets at 18
  // Map 6-18 to 0-PI for the arc
  const dayProgress = Math.max(0, Math.min(1, (time - 6) / 12))
  const angle = dayProgress * Math.PI

  // Sun height (Y) follows a sine curve, max at noon
  const height = Math.sin(angle) * 10 + 0.5

  // Sun moves from east (+X) to west (-X)
  const x = Math.cos(angle) * 8

  // Sun is to the south (+Z) at noon (northern hemisphere)
  const z = Math.sin(angle) * 5

  return [x, Math.max(0.5, height), z]
}

// Realistic sun position using suncalc library
// Coordinate system: -Z is north, +X is east, +Z is south, -X is west
function getRealisticSunPosition(
  timeOfDay: number,
  latitude: number,
  longitude: number,
  date: Date
): [number, number, number] {
  // Create date with the specified time
  const dateWithTime = new Date(date)
  dateWithTime.setHours(Math.floor(timeOfDay), (timeOfDay % 1) * 60, 0, 0)

  // Get sun position from suncalc
  const sunPos = SunCalc.getPosition(dateWithTime, latitude, longitude)

  // sunPos.azimuth: sun direction in radians (0 = south, positive = west)
  // sunPos.altitude: sun height in radians (0 = horizon, PI/2 = zenith)

  // Convert to our coordinate system
  // azimuth 0 = south (+Z), azimuth PI/2 = west (-X), azimuth -PI/2 = east (+X)
  const distance = 10
  const elevation = Math.max(0, sunPos.altitude)

  // Convert spherical to cartesian
  // In suncalc: azimuth 0 is south, positive is clockwise (towards west)
  // In our system: +Z is south, -X is west, +X is east
  const x = -Math.sin(sunPos.azimuth) * Math.cos(elevation) * distance
  const z = Math.cos(sunPos.azimuth) * Math.cos(elevation) * distance
  const y = Math.sin(elevation) * distance

  return [x, Math.max(0.5, y), z]
}

interface SunLightProps {
  timeOfDay: number
  shadows: boolean
  latitude?: number
  longitude?: number
  date?: Date
}

function SunLight({ timeOfDay, shadows, latitude, longitude, date }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null)

  const position = useMemo(() => {
    if (latitude !== undefined && longitude !== undefined) {
      return getRealisticSunPosition(timeOfDay, latitude, longitude, date || new Date())
    }
    return getSimpleSunPosition(timeOfDay)
  }, [timeOfDay, latitude, longitude, date])

  // Get sunrise/sunset times for realistic mode
  const sunTimes = useMemo(() => {
    if (latitude !== undefined && longitude !== undefined) {
      const times = SunCalc.getTimes(date || new Date(), latitude, longitude)
      return {
        sunrise: times.sunrise.getHours() + times.sunrise.getMinutes() / 60,
        sunset: times.sunset.getHours() + times.sunset.getMinutes() / 60,
        solarNoon: times.solarNoon.getHours() + times.solarNoon.getMinutes() / 60,
      }
    }
    return { sunrise: 6, sunset: 18, solarNoon: 12 }
  }, [latitude, longitude, date])

  // Calculate intensity based on time (dimmer at dawn/dusk)
  const intensity = useMemo(() => {
    const time = ((timeOfDay % 24) + 24) % 24
    const { sunrise, sunset } = sunTimes

    if (time < sunrise || time > sunset) return 0.1 // Night
    const dayLength = sunset - sunrise
    const dayProgress = (time - sunrise) / dayLength
    return 0.3 + Math.sin(dayProgress * Math.PI) * 0.7
  }, [timeOfDay, sunTimes])

  // Warmer color at dawn/dusk
  const color = useMemo(() => {
    const time = ((timeOfDay % 24) + 24) % 24
    const { sunrise, sunset } = sunTimes

    if (time < sunrise || time > sunset) return '#4a5568' // Night - bluish
    const dayLength = sunset - sunrise
    const dayProgress = (time - sunrise) / dayLength
    const warmth = 1 - Math.sin(dayProgress * Math.PI)
    // Interpolate from warm orange to white and back
    const r = 255
    const g = Math.round(255 - warmth * 80)
    const b = Math.round(255 - warmth * 120)
    return `rgb(${r},${g},${b})`
  }, [timeOfDay, sunTimes])

  return (
    <directionalLight
      ref={lightRef}
      position={position}
      intensity={intensity}
      color={color}
      castShadow={shadows}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-far={50}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-bias={-0.0001}
    />
  )
}

interface DraggablePointProps {
  position: THREE.Vector3
  color: string
  canDelete: boolean
  isSelectMode: boolean
  isSelected: boolean
  onDragStart: () => void
  onDrag: (newPosition: THREE.Vector3) => void
  onDragEnd: () => void
  onDelete: () => void
  onSelect: () => void
}

function DraggablePoint({
  position,
  color,
  canDelete,
  isSelectMode,
  isSelected,
  onDragStart,
  onDrag,
  onDragEnd,
  onDelete,
  onSelect,
}: DraggablePointProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const { camera, raycaster, gl } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersection)

      if (intersection) {
        intersection.y = OUTLINE_HEIGHT
        onDrag(intersection)
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      onDragEnd()
    }

    gl.domElement.addEventListener('pointermove', handlePointerMove)
    gl.domElement.addEventListener('pointerup', handlePointerUp)

    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove)
      gl.domElement.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, camera, raycaster, gl, plane, onDrag, onDragEnd])

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (isSelectMode) {
        onSelect()
      } else {
        setIsDragging(true)
        onDragStart()
      }
    },
    [isSelectMode, onSelect, onDragStart]
  )

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (canDelete && !isSelectMode) {
        onDelete()
      }
    },
    [canDelete, isSelectMode, onDelete]
  )

  const size = isHovered || isDragging || isSelected ? POINT_SIZE_HOVER : POINT_SIZE

  const getColor = () => {
    if (isSelected) return '#00ff00'
    if (isDragging) return '#ffffff'
    if (isHovered && isSelectMode) return '#00ffff'
    if (isHovered && canDelete) return '#ff6600'
    if (isHovered) return '#ffff00'
    return color
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={getColor()} />
    </mesh>
  )
}

interface ClickableEdgeProps {
  start: THREE.Vector3
  end: THREE.Vector3
  allPoints: THREE.Vector3[]
  onAddPoint: (position: THREE.Vector3) => void
}

const MIN_DISTANCE_FROM_POINT = 0.15

function ClickableEdge({ start, end, allPoints, onAddPoint }: ClickableEdgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const midpoint = useMemo(() => {
    return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  }, [start, end])

  const length = useMemo(() => start.distanceTo(end), [start, end])

  const rotation = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start).normalize()
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return euler
  }, [start, end])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const clickPoint = e.point.clone()
      clickPoint.y = OUTLINE_HEIGHT

      // Don't add point if too close to existing points
      const tooCloseToPoint = allPoints.some(
        (p) => clickPoint.distanceTo(p) < MIN_DISTANCE_FROM_POINT
      )
      if (tooCloseToPoint) return

      onAddPoint(clickPoint)
    },
    [onAddPoint, allPoints]
  )

  return (
    <mesh
      position={midpoint}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <cylinderGeometry args={[isHovered ? 0.04 : 0.02, isHovered ? 0.04 : 0.02, length, 8]} />
      <meshBasicMaterial
        color={isHovered ? '#00ffff' : '#ffffff'}
        transparent
        opacity={isHovered ? 0.6 : 0}
      />
    </mesh>
  )
}

interface ImagePlaneProps {
  textureUrl: string | null
  aspectRatio: number
  isAddingPolygon: boolean
  isMeasuring: boolean
  receiveShadow: boolean
  onPlaneClick: (point: THREE.Vector3) => void
  onMeasureClick: (point: THREE.Vector3) => void
}

function ImagePlane({ textureUrl, aspectRatio, isAddingPolygon, isMeasuring, receiveShadow, onPlaneClick, onMeasureClick }: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useMemo(
    () => (textureUrl ? new THREE.TextureLoader().load(textureUrl) : null),
    [textureUrl]
  )

  const planeWidth = 5
  const planeHeight = planeWidth / aspectRatio

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (isAddingPolygon) {
        e.stopPropagation()
        const point = e.point.clone()
        point.y = OUTLINE_HEIGHT
        onPlaneClick(point)
      } else if (isMeasuring) {
        e.stopPropagation()
        const point = e.point.clone()
        point.y = OUTLINE_HEIGHT
        onMeasureClick(point)
      }
    },
    [isAddingPolygon, isMeasuring, onPlaneClick, onMeasureClick]
  )

  if (!texture) return null

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleClick}
      receiveShadow={receiveShadow}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      {receiveShadow ? (
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
      ) : (
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      )}
    </mesh>
  )
}

interface ClosingPointProps {
  position: THREE.Vector3
  color: string
  canClose: boolean
  onClose: () => void
}

function ClosingPoint({ position, color, canClose, onClose }: ClosingPointProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!canClose) return
      e.stopPropagation()
      onClose()
    },
    [canClose, onClose]
  )

  const size = isHovered && canClose ? POINT_SIZE_HOVER : POINT_SIZE

  return (
    <mesh
      position={position}
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={isHovered && canClose ? '#00ff00' : color} />
    </mesh>
  )
}

interface PolygonFillProps {
  points: THREE.Vector3[]
  color: string
  onClick: () => void
}

function PolygonFill({ points, color, onClick }: PolygonFillProps) {
  const [isHovered, setIsHovered] = useState(false)

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    // Negate Z to counteract the rotation's Z flip
    shape.moveTo(points[0].x, -points[0].z)

    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, -points[i].z)
    }
    shape.closePath()

    return new THREE.ShapeGeometry(shape)
  }, [points])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onClick()
    },
    [onClick]
  )

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, OUTLINE_HEIGHT + 0.001, 0]}
      onClick={handleClick}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <meshBasicMaterial
        color={isHovered ? '#00ff00' : color}
        transparent
        opacity={isHovered ? 0.4 : 0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

interface BuildingBodyProps {
  body: Body
  isAddingBody: boolean
  imageUrl: string | null
  aspectRatio: number
  castShadow: boolean
  onDelete: () => void
}

const PLANE_WIDTH = 5

function BuildingBody({ body, isAddingBody, imageUrl, aspectRatio, castShadow, onDelete }: BuildingBodyProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Load the image texture
  const texture = useMemo(() => {
    if (!imageUrl) return null
    const tex = new THREE.TextureLoader().load(imageUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [imageUrl])

  // Create the extruded geometry for the walls
  const wallsGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const firstPoint = body.points[0]
    shape.moveTo(firstPoint.x, -firstPoint.z)

    for (let i = 1; i < body.points.length; i++) {
      shape.lineTo(body.points[i].x, -body.points[i].z)
    }
    shape.closePath()

    const extrudeSettings = {
      depth: body.height,
      bevelEnabled: false,
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [body.points, body.height])

  // Create the top face geometry with proper UV mapping for texture projection
  const topGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const firstPoint = body.points[0]
    shape.moveTo(firstPoint.x, -firstPoint.z)

    for (let i = 1; i < body.points.length; i++) {
      shape.lineTo(body.points[i].x, -body.points[i].z)
    }
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)

    // Calculate UV coordinates to project the image onto the top face
    const planeHeight = PLANE_WIDTH / aspectRatio
    const uvAttribute = geo.attributes.uv
    const posAttribute = geo.attributes.position

    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i)
      const y = posAttribute.getY(i) // This is -z in world coords

      // Map world coordinates to UV (0-1 range)
      // u maps from x, v maps from z (y in shape coords is -z)
      const u = (x + PLANE_WIDTH / 2) / PLANE_WIDTH
      // Flip v to match image orientation
      const v = 1 - (-y + planeHeight / 2) / planeHeight

      uvAttribute.setXY(i, u, v)
    }

    uvAttribute.needsUpdate = true
    return geo
  }, [body.points, aspectRatio])

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (isAddingBody) {
        e.stopPropagation()
        onDelete()
      }
    },
    [isAddingBody, onDelete]
  )

  return (
    <group
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
    >
      {/* Walls */}
      <mesh
        geometry={wallsGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        castShadow={castShadow}
        receiveShadow={castShadow}
      >
        <meshStandardMaterial
          color={isHovered && isAddingBody ? '#ff6666' : body.color}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Top face with image texture - slightly above to avoid z-fighting */}
      <mesh
        geometry={topGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, body.height + 0.001, 0]}
        castShadow={castShadow}
      >
        {texture ? (
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        ) : (
          <meshStandardMaterial color={body.color} side={THREE.DoubleSide} />
        )}
      </mesh>
    </group>
  )
}

interface BuildingBodiesProps {
  bodies: Body[]
  isAddingBody: boolean
  imageUrl: string | null
  aspectRatio: number
  castShadow: boolean
  onDeleteBody: (bodyId: string) => void
}

function BuildingBodies({ bodies, isAddingBody, imageUrl, aspectRatio, castShadow, onDeleteBody }: BuildingBodiesProps) {
  return (
    <>
      {bodies.map((body) => {
        // Skip hidden bodies
        if (body.visible === false) return null

        return (
          <BuildingBody
            key={body.id}
            body={body}
            isAddingBody={isAddingBody}
            imageUrl={imageUrl}
            aspectRatio={aspectRatio}
            castShadow={castShadow}
            onDelete={() => onDeleteBody(body.id)}
          />
        )
      })}
    </>
  )
}

interface PolygonOutlinesProps {
  polygons: Polygon[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  isAddingLine: boolean
  isAddingBody: boolean
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  onPointDragStart: () => void
  onPointDrag: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => void
  onPointDragEnd: () => void
  onPointDelete: (polygonId: string, pointIndex: number) => void
  onAddPointOnEdge: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void
  onPointSelect: (polygonId: string, pointIndex: number) => void
  onClosePolygon: () => void
  onPolygonClick: (polygonId: string) => void
}

function PolygonOutlines({
  polygons,
  currentPoints,
  currentColor,
  isAddingLine,
  isAddingBody,
  selectedLinePoints,
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

  return (
    <>
      {polygons.map((polygon) => {
        // Skip hidden polygons
        if (polygon.visible === false) return null

        const canDeletePoints = polygon.points.length > 3

        return (
          <group key={polygon.id}>
            {/* Clickable polygon fill for body tool */}
            {isAddingBody && polygon.points.length >= 3 && (
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
                  {!isAddingLine && !isAddingBody && (
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
          <mesh key={`current-${i}`} position={point}>
            <sphereGeometry args={[POINT_SIZE, 16, 16]} />
            <meshBasicMaterial color={currentColor} />
          </mesh>
        )
      )}
    </>
  )
}

function GridHelper({ size }: { size: number }) {
  return <gridHelper args={[size, size, '#888888', '#cccccc']} />
}

interface CompassProps {
  onRotationChange: (angle: number) => void
}

function Compass({ onRotationChange }: CompassProps) {
  const { camera } = useThree()

  useEffect(() => {
    const updateRotation = () => {
      // Get the camera's azimuthal angle (rotation around Y axis)
      // In our scene, -Z is north (top of image), so we calculate angle from -Z axis
      const cameraDirection = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)
      // Project onto XZ plane
      cameraDirection.y = 0
      cameraDirection.normalize()
      // Calculate angle from -Z axis (north)
      const angle = Math.atan2(cameraDirection.x, -cameraDirection.z)
      onRotationChange(-angle * (180 / Math.PI))
    }

    // Initial update
    updateRotation()

    // Subscribe to camera changes via animation frame
    let animationId: number
    const animate = () => {
      updateRotation()
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [camera, onRotationChange])

  return null
}

interface SceneProps {
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
  isMeasuring: boolean
  measurePoints: THREE.Vector3[]
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  polygons: Polygon[]
  bodies: Body[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  onPlaneClick: (point: THREE.Vector3) => void
  onMeasureClick: (point: THREE.Vector3) => void
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

function Scene({
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
  isMeasuring,
  measurePoints,
  selectedLinePoints,
  polygons,
  bodies,
  currentPoints,
  currentColor,
  onPlaneClick,
  onMeasureClick,
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
  const orbitEnabled = !isAddingPolygon && !isAddingLine && !isAddingBody && !isMeasuring && !isDraggingPoint

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
        isMeasuring={isMeasuring}
        receiveShadow={shadows}
        onPlaneClick={onPlaneClick}
        onMeasureClick={onMeasureClick}
      />
      {/* Measurement line */}
      {measurePoints.length >= 1 && (
        <>
          {measurePoints.map((point, i) => (
            <mesh key={`measure-point-${i}`} position={point}>
              <sphereGeometry args={[POINT_SIZE, 16, 16]} />
              <meshBasicMaterial color="#ffaa00" />
            </mesh>
          ))}
          {measurePoints.length === 2 && (
            <Line
              points={measurePoints}
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

const COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff']

// Tool Icons
const IconCursor = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4l7 17 2.5-6.5L20 12 4 4z" />
  </svg>
)

const IconPolygon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 22,8.5 18,21 6,21 2,8.5" />
  </svg>
)

const IconLine = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="19" x2="19" y2="5" />
    <circle cx="5" cy="19" r="2" fill="currentColor" />
    <circle cx="19" cy="5" r="2" fill="currentColor" />
  </svg>
)

const IconBody = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
    <path d="M2 7l10 5 10-5" />
    <path d="M12 12v10" />
  </svg>
)

const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const IconUndo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M3 13c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9a9 9 0 01-7.5-4" />
  </svg>
)

const IconRedo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" />
    <path d="M21 13c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9a9 9 0 007.5-4" />
  </svg>
)

const IconMeasure = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)

const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

type Tool = 'select' | 'polygon' | 'line' | 'body' | 'measure'

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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [selectedLinePoints, setSelectedLinePoints] = useState<{
    polygonId: string
    pointIndex: number
  } | null>(null)
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBodies, setInternalBodies] = useState<Body[]>([])
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([])
  const [knownLength, setKnownLength] = useState<number>(4.5) // default car length
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Dynamic calculation of pixels per meter
  const calculatedPixelsPerMeter = useMemo(() => {
    if (measurePoints.length !== 2 || !imageWidth || knownLength <= 0) return null

    // Calculate distance in Three.js units
    const distanceInUnits = measurePoints[0].distanceTo(measurePoints[1])

    // Convert to pixels: PLANE_WIDTH units = imageWidth pixels
    const distanceInPixels = distanceInUnits * (imageWidth / PLANE_WIDTH)

    // Calculate pixels per meter
    return distanceInPixels / knownLength
  }, [measurePoints, imageWidth, knownLength])
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([])
  const [isDraggingPoint, setIsDraggingPoint] = useState(false)
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

      // Check if points actually changed to avoid unnecessary updates
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

    // Only update if something actually changed
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

  const isAddingPolygon = activeTool === 'polygon'
  const isAddingLine = activeTool === 'line'
  const isAddingBody = activeTool === 'body'
  const isMeasuring = activeTool === 'measure'

  const currentColor = outlineColor || COLORS[polygons.length % COLORS.length]

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

  const handlePointDragStart = useCallback(() => {
    setIsDraggingPoint(true)
    historyContext?.beginBatch()
  }, [historyContext])

  const handlePointDrag = useCallback(
    (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => {
      // During drag, always update internal state for smooth visual feedback
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
    // Sync with external state on drag end
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
        // Update line indices after point removal
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
        // Update line indices after point insertion
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

  const handleSelectTool = useCallback((tool: Tool) => {
    if (activeTool === 'polygon' && currentPoints.length > 0) {
      setCurrentPoints([])
    }
    if (activeTool === 'measure') {
      setMeasurePoints([])
    }
    setSelectedLinePoints(null)
    setActiveTool(tool)
  }, [activeTool, currentPoints.length])

  // Escape key switches to select tool
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

  const handlePointSelect = useCallback(
    (polygonId: string, pointIndex: number) => {
      if (!selectedLinePoints) {
        // First point selected
        setSelectedLinePoints({ polygonId, pointIndex })
      } else if (selectedLinePoints.polygonId === polygonId) {
        // Second point selected in same polygon
        if (selectedLinePoints.pointIndex !== pointIndex) {
          // Check if line already exists
          const polygon = polygons.find((p) => p.id === polygonId)
          if (polygon) {
            const lineExists = polygon.lines?.some(
              ([a, b]) =>
                (a === selectedLinePoints.pointIndex && b === pointIndex) ||
                (a === pointIndex && b === selectedLinePoints.pointIndex)
            )

            // Check if it's an edge (adjacent points)
            const isEdge =
              Math.abs(selectedLinePoints.pointIndex - pointIndex) === 1 ||
              (selectedLinePoints.pointIndex === 0 && pointIndex === polygon.points.length - 1) ||
              (pointIndex === 0 && selectedLinePoints.pointIndex === polygon.points.length - 1)

            if (!lineExists && !isEdge) {
              // Add the line
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
        // Different polygon, reset selection
        setSelectedLinePoints({ polygonId, pointIndex })
      }
    },
    [selectedLinePoints, polygons, setPolygons, historyContext]
  )

  const handlePolygonClick = useCallback(
    (polygonId: string) => {
      if (!isAddingBody) return

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
    [isAddingBody, polygons, bodies, setBodies]
  )

  const handleDeleteBody = useCallback(
    (bodyId: string) => {
      setBodies(bodies.filter((b) => b.id !== bodyId))
    },
    [bodies, setBodies]
  )

  const handleMeasureClick = useCallback(
    (point: THREE.Vector3) => {
      if (measurePoints.length < 2) {
        setMeasurePoints((prev) => [...prev, point])
      } else {
        // Reset and start new measurement
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
            <div className="canvas3d-time-control">
              <div className="canvas3d-time-icon">
                <IconSun />
              </div>
              <input
                type="range"
                className="canvas3d-time-slider"
                min="0"
                max="24"
                step="0.5"
                value={timeOfDay}
                onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))}
                title={`Time: ${Math.floor(timeOfDay)}:${String(Math.round((timeOfDay % 1) * 60)).padStart(2, '0')}`}
              />
              <span className="canvas3d-time-label">
                {Math.floor(timeOfDay)}:{String(Math.round((timeOfDay % 1) * 60)).padStart(2, '0')}
              </span>
            </div>
          )}
          <div className="canvas3d-compass">
            <div
              className="canvas3d-compass-rose"
              style={{ transform: `rotate(${compassRotation}deg)` }}
            >
              <div className="canvas3d-compass-n">N</div>
              <div className="canvas3d-compass-e">E</div>
              <div className="canvas3d-compass-s">S</div>
              <div className="canvas3d-compass-w">W</div>
              <div className="canvas3d-compass-needle" />
            </div>
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="canvas3d-toolbox">
          <button
            className={`canvas3d-tool ${activeTool === 'select' ? 'canvas3d-tool--active' : ''}`}
            onClick={() => handleSelectTool('select')}
            title="Select"
          >
            <IconCursor />
            <span className="canvas3d-tool-tooltip">Select (V)</span>
          </button>
          <button
            className={`canvas3d-tool ${activeTool === 'polygon' ? 'canvas3d-tool--active' : ''}`}
            onClick={() => handleSelectTool('polygon')}
            title="Add Polygon"
          >
            <IconPolygon />
            <span className="canvas3d-tool-tooltip">Add Polygon (P)</span>
          </button>
          <button
            className={`canvas3d-tool ${activeTool === 'line' ? 'canvas3d-tool--active' : ''}`}
            onClick={() => handleSelectTool('line')}
            disabled={polygons.length === 0}
            title="Add Line"
          >
            <IconLine />
            <span className="canvas3d-tool-tooltip">Add Line (L)</span>
          </button>
          <button
            className={`canvas3d-tool ${activeTool === 'body' ? 'canvas3d-tool--active' : ''}`}
            onClick={() => handleSelectTool('body')}
            disabled={polygons.length === 0}
            title="Add Body"
          >
            <IconBody />
            <span className="canvas3d-tool-tooltip">Add Body (B)</span>
          </button>
          <button
            className={`canvas3d-tool ${activeTool === 'measure' ? 'canvas3d-tool--active' : ''}`}
            onClick={() => handleSelectTool('measure')}
            title="Calculate pixels per meter"
          >
            <IconMeasure />
            <span className="canvas3d-tool-tooltip">Pixels/Meter (M)</span>
          </button>

          {historyContext && (
            <>
              <div className="canvas3d-toolbox-divider" />

              <button
                className="canvas3d-tool"
                onClick={historyContext.undo}
                disabled={!historyContext.canUndo}
                title="Undo (Ctrl+Z)"
              >
                <IconUndo />
                <span className="canvas3d-tool-tooltip">Undo</span>
              </button>
              <button
                className="canvas3d-tool"
                onClick={historyContext.redo}
                disabled={!historyContext.canRedo}
                title="Redo (Ctrl+Shift+Z)"
              >
                <IconRedo />
                <span className="canvas3d-tool-tooltip">Redo</span>
              </button>
            </>
          )}
        </div>
      )}

      {isAddingPolygon && currentPoints.length > 0 && (
        <div className="canvas3d-actions">
          <button className="canvas3d-action-btn" onClick={handleUndoPoint}>
            Undo
          </button>
          {currentPoints.length >= 3 && (
            <button className="canvas3d-action-btn canvas3d-action-btn--primary" onClick={handleFinishPolygon}>
              Finish
            </button>
          )}
          <button className="canvas3d-action-btn canvas3d-action-btn--danger" onClick={handleCancelDrawing}>
            Cancel
          </button>
        </div>
      )}

      {isAddingPolygon && (
        <div className="canvas3d-status">
          {currentPoints.length === 0
            ? 'Click to place points'
            : `${currentPoints.length} points${currentPoints.length >= 3 ? ' • Click first point to close' : ''}`}
        </div>
      )}

      {isAddingLine && (
        <div className="canvas3d-status">
          {selectedLinePoints
            ? 'Click another point to create a line'
            : 'Click on a point to start a line'}
        </div>
      )}

      {isAddingBody && (
        <div className="canvas3d-status">
          Click on a polygon to create a 3D body • Right-click body to delete
        </div>
      )}

      {isMeasuring && (
        <div className="canvas3d-status">
          {measurePoints.length === 0
            ? 'Click to place first point on a known object'
            : measurePoints.length === 1
              ? 'Click to place second point'
              : 'Measurement complete • Adjust known length below'}
        </div>
      )}

      {isMeasuring && measurePoints.length === 2 && (
        <div className="canvas3d-measure-panel">
          <div className="canvas3d-measure-row">
            <label className="canvas3d-measure-label">Known length</label>
            <div className="canvas3d-measure-input-group">
              <input
                type="number"
                className="canvas3d-measure-input"
                min="0.1"
                step="0.1"
                value={knownLength}
                onChange={(e) => setKnownLength(parseFloat(e.target.value) || 0)}
              />
              <span className="canvas3d-measure-unit">m</span>
            </div>
          </div>
          {calculatedPixelsPerMeter !== null && (
            <div className="canvas3d-measure-row">
              <label className="canvas3d-measure-label">Pixels/Meter</label>
              <div className="canvas3d-measure-input-group">
                <input
                  type="text"
                  className="canvas3d-measure-input canvas3d-measure-input--readonly"
                  value={copyFeedback ? 'Copied!' : calculatedPixelsPerMeter.toFixed(2)}
                  readOnly
                />
                <button
                  className="canvas3d-measure-copy"
                  onClick={handleCopyPixelsPerMeter}
                  title="Copy to clipboard"
                >
                  <IconCopy />
                </button>
              </div>
            </div>
          )}
          <div className="canvas3d-measure-actions">
            <button
              className="canvas3d-action-btn"
              onClick={handleClearMeasurement}
            >
              Clear
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
