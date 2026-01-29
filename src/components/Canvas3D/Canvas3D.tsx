import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import './Canvas3D.css'

export interface Polygon {
  id: string
  points: THREE.Vector3[]
  color: string
  lines: [number, number][]  // pairs of point indices that form internal lines
}

export interface Body {
  id: string
  polygonId: string  // reference to source polygon
  points: THREE.Vector3[]  // base points (from polygon)
  height: number
  color: string
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
  onImageLoad?: (file: File) => void
  onPolygonsChange?: (polygons: Polygon[]) => void
  onBodiesChange?: (bodies: Body[]) => void
  onTimeOfDayChange?: (time: number) => void
}

const OUTLINE_HEIGHT = 0.01
const POINT_SIZE = 0.05
const POINT_SIZE_HOVER = 0.07

// Calculate sun position based on time of day (0-24)
// Coordinate system: -Z is north, +X is east, +Z is south, -X is west
function getSunPosition(timeOfDay: number): [number, number, number] {
  // Normalize time to 0-24 range
  const time = ((timeOfDay % 24) + 24) % 24

  // Sun arc: rises at 6, peaks at 12, sets at 18
  // Map 6-18 to 0-PI for the arc
  const dayProgress = Math.max(0, Math.min(1, (time - 6) / 12))
  const angle = dayProgress * Math.PI

  // Sun height (Y) follows a sine curve, max at noon
  const height = Math.sin(angle) * 10 + 0.5

  // Sun moves from east (+X) to west (-X)
  // At 6am (angle=0): cos(0)=1 → x=+8 (east)
  // At 12pm (angle=PI/2): cos(PI/2)=0 → x=0 (south)
  // At 6pm (angle=PI): cos(PI)=-1 → x=-8 (west)
  const x = Math.cos(angle) * 8

  // Sun is to the south (+Z) at noon (northern hemisphere)
  // Higher Z at noon, lower at sunrise/sunset
  const z = Math.sin(angle) * 5

  return [x, Math.max(0.5, height), z]
}

interface SunLightProps {
  timeOfDay: number
  shadows: boolean
}

function SunLight({ timeOfDay, shadows }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const position = useMemo(() => getSunPosition(timeOfDay), [timeOfDay])

  // Calculate intensity based on time (dimmer at dawn/dusk)
  const intensity = useMemo(() => {
    const time = ((timeOfDay % 24) + 24) % 24
    if (time < 6 || time > 18) return 0.1 // Night
    const dayProgress = (time - 6) / 12
    return 0.3 + Math.sin(dayProgress * Math.PI) * 0.7
  }, [timeOfDay])

  // Warmer color at dawn/dusk
  const color = useMemo(() => {
    const time = ((timeOfDay % 24) + 24) % 24
    if (time < 6 || time > 18) return '#4a5568' // Night - bluish
    const dayProgress = (time - 6) / 12
    const warmth = 1 - Math.sin(dayProgress * Math.PI)
    // Interpolate from warm orange to white and back
    const r = 255
    const g = Math.round(255 - warmth * 80)
    const b = Math.round(255 - warmth * 120)
    return `rgb(${r},${g},${b})`
  }, [timeOfDay])

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
  receiveShadow: boolean
  onPlaneClick: (point: THREE.Vector3) => void
}

function ImagePlane({ textureUrl, aspectRatio, isAddingPolygon, receiveShadow, onPlaneClick }: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useMemo(
    () => (textureUrl ? new THREE.TextureLoader().load(textureUrl) : null),
    [textureUrl]
  )

  const planeWidth = 5
  const planeHeight = planeWidth / aspectRatio

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isAddingPolygon) return
      e.stopPropagation()
      const point = e.point.clone()
      point.y = OUTLINE_HEIGHT
      onPlaneClick(point)
    },
    [isAddingPolygon, onPlaneClick]
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
      {bodies.map((body) => (
        <BuildingBody
          key={body.id}
          body={body}
          isAddingBody={isAddingBody}
          imageUrl={imageUrl}
          aspectRatio={aspectRatio}
          castShadow={castShadow}
          onDelete={() => onDeleteBody(body.id)}
        />
      ))}
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
  isAddingPolygon: boolean
  isAddingLine: boolean
  isAddingBody: boolean
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  polygons: Polygon[]
  bodies: Body[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  onPlaneClick: (point: THREE.Vector3) => void
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
  isAddingPolygon,
  isAddingLine,
  isAddingBody,
  selectedLinePoints,
  polygons,
  bodies,
  currentPoints,
  currentColor,
  onPlaneClick,
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
  const orbitEnabled = !isAddingPolygon && !isAddingLine && !isAddingBody && !isDraggingPoint

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
      <SunLight timeOfDay={timeOfDay} shadows={shadows} />
      <Compass onRotationChange={onCompassRotationChange} />

      {showGrid && <GridHelper size={gridSize} />}
      <ImagePlane
        textureUrl={imageUrl}
        aspectRatio={aspectRatio}
        isAddingPolygon={isAddingPolygon}
        receiveShadow={shadows}
        onPlaneClick={onPlaneClick}
      />
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

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
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

type Tool = 'select' | 'polygon' | 'line' | 'body'

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
  polygons: controlledPolygons,
  bodies: controlledBodies,
  onImageLoad,
  onPolygonsChange,
  onBodiesChange,
  onTimeOfDayChange,
}: Canvas3DProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [selectedLinePoints, setSelectedLinePoints] = useState<{
    polygonId: string
    pointIndex: number
  } | null>(null)
  const [internalPolygons, setInternalPolygons] = useState<Polygon[]>([])
  const [internalBodies, setInternalBodies] = useState<Body[]>([])
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

  const currentColor = outlineColor || COLORS[polygons.length % COLORS.length]

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return

      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        setAspectRatio(img.width / img.height)
        setImageUrl(url)
        onImageLoad?.(file)
      }
      img.src = url
    },
    [onImageLoad]
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
  }, [currentPoints, currentColor, polygons, setPolygons])

  const handleCancelDrawing = useCallback(() => {
    setCurrentPoints([])
    setActiveTool('select')
    setSelectedLinePoints(null)
  }, [])

  const handleUndoPoint = useCallback(() => {
    setCurrentPoints((prev) => prev.slice(0, -1))
  }, [])

  const handleDeleteLastPolygon = useCallback(() => {
    if (polygons.length === 0) return
    const lastPolygon = polygons[polygons.length - 1]
    setPolygons(polygons.slice(0, -1))
    // Also delete any bodies associated with the deleted polygon
    const newBodies = bodies.filter((b) => b.polygonId !== lastPolygon.id)
    if (newBodies.length !== bodies.length) {
      setBodies(newBodies)
    }
  }, [polygons, bodies, setPolygons, setBodies])

  const handlePointDragStart = useCallback(() => {
    setIsDraggingPoint(true)
  }, [])

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
    // Sync with external state on drag end
    onPolygonsChange?.(internalPolygons)
  }, [internalPolygons, onPolygonsChange])

  const handlePointDelete = useCallback(
    (polygonId: string, pointIndex: number) => {
      const newPolygons = polygons.map((p) => {
        if (p.id !== polygonId) return p
        if (p.points.length <= 3) return p
        const newPoints = [...p.points]
        newPoints.splice(pointIndex, 1)
        return { ...p, points: newPoints }
      })
      setPolygons(newPolygons)
    },
    [polygons, setPolygons]
  )

  const handleAddPointOnEdge = useCallback(
    (polygonId: string, edgeIndex: number, position: THREE.Vector3) => {
      const newPolygons = polygons.map((p) => {
        if (p.id !== polygonId) return p
        const newPoints = [...p.points]
        newPoints.splice(edgeIndex + 1, 0, position)
        return { ...p, points: newPoints }
      })
      setPolygons(newPolygons)
    },
    [polygons, setPolygons]
  )

  const handleSelectTool = useCallback((tool: Tool) => {
    if (activeTool === 'polygon' && currentPoints.length > 0) {
      setCurrentPoints([])
    }
    setSelectedLinePoints(null)
    setActiveTool(tool)
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
    [selectedLinePoints, polygons, setPolygons]
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
          isAddingPolygon={isAddingPolygon}
          isAddingLine={isAddingLine}
          isAddingBody={isAddingBody}
          selectedLinePoints={selectedLinePoints}
          polygons={polygons}
          bodies={bodies}
          currentPoints={currentPoints}
          currentColor={currentColor}
          onPlaneClick={handlePlaneClick}
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
      )}

      {imageUrl && showTimeControl && (
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

          <div className="canvas3d-toolbox-divider" />

          <button
            className="canvas3d-tool canvas3d-tool--danger"
            onClick={handleDeleteLastPolygon}
            disabled={polygons.length === 0}
            title="Delete Last Polygon"
          >
            <IconTrash />
            <span className="canvas3d-tool-tooltip">Delete Last</span>
          </button>
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
    </div>
  )
}
