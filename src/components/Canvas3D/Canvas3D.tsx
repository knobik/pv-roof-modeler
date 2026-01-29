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

export interface Canvas3DProps {
  width?: number | string
  height?: number | string
  backgroundColor?: string
  gridSize?: number
  showGrid?: boolean
  outlineColor?: string
  polygons?: Polygon[]
  onImageLoad?: (file: File) => void
  onPolygonsChange?: (polygons: Polygon[]) => void
}

const OUTLINE_HEIGHT = 0.01
const POINT_SIZE = 0.05
const POINT_SIZE_HOVER = 0.07

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
  onPlaneClick: (point: THREE.Vector3) => void
}

function ImagePlane({ textureUrl, aspectRatio, isAddingPolygon, onPlaneClick }: ImagePlaneProps) {
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
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
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

interface PolygonOutlinesProps {
  polygons: Polygon[]
  currentPoints: THREE.Vector3[]
  currentColor: string
  isAddingLine: boolean
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  onPointDragStart: () => void
  onPointDrag: (polygonId: string, pointIndex: number, newPosition: THREE.Vector3) => void
  onPointDragEnd: () => void
  onPointDelete: (polygonId: string, pointIndex: number) => void
  onAddPointOnEdge: (polygonId: string, edgeIndex: number, position: THREE.Vector3) => void
  onPointSelect: (polygonId: string, pointIndex: number) => void
  onClosePolygon: () => void
}

function PolygonOutlines({
  polygons,
  currentPoints,
  currentColor,
  isAddingLine,
  selectedLinePoints,
  onPointDragStart,
  onPointDrag,
  onPointDragEnd,
  onPointDelete,
  onAddPointOnEdge,
  onPointSelect,
  onClosePolygon,
}: PolygonOutlinesProps) {
  const canClose = currentPoints.length >= 3

  return (
    <>
      {polygons.map((polygon) => {
        const canDeletePoints = polygon.points.length > 3

        return (
          <group key={polygon.id}>
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
                  {!isAddingLine && (
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

interface SceneProps {
  imageUrl: string | null
  aspectRatio: number
  showGrid: boolean
  gridSize: number
  backgroundColor: string
  isAddingPolygon: boolean
  isAddingLine: boolean
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  polygons: Polygon[]
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
  orbitControlsRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>
  isDraggingPoint: boolean
}

function Scene({
  imageUrl,
  aspectRatio,
  showGrid,
  gridSize,
  backgroundColor,
  isAddingPolygon,
  isAddingLine,
  selectedLinePoints,
  polygons,
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
  orbitControlsRef,
  isDraggingPoint,
}: SceneProps) {
  const orbitEnabled = !isAddingPolygon && !isAddingLine && !isDraggingPoint

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      {showGrid && <GridHelper size={gridSize} />}
      <ImagePlane
        textureUrl={imageUrl}
        aspectRatio={aspectRatio}
        isAddingPolygon={isAddingPolygon}
        onPlaneClick={onPlaneClick}
      />
      <PolygonOutlines
        polygons={polygons}
        currentPoints={currentPoints}
        currentColor={currentColor}
        isAddingLine={isAddingLine}
        selectedLinePoints={selectedLinePoints}
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

const IconUndo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M3 13a9 9 0 1018 0 9 9 0 00-15-6.7L3 7" />
  </svg>
)

type Tool = 'select' | 'polygon' | 'line'

export function Canvas3D({
  width = '100%',
  height = 500,
  backgroundColor = '#1a1a2e',
  gridSize = 10,
  showGrid = true,
  outlineColor,
  polygons: controlledPolygons,
  onImageLoad,
  onPolygonsChange,
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
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([])
  const [isDraggingPoint, setIsDraggingPoint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const orbitControlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null)

  // Support both controlled and uncontrolled modes
  const isControlled = controlledPolygons !== undefined

  // Always render from internal state for smooth drag feedback
  const polygons = internalPolygons

  // Sync internal state with controlled props (but not during drag)
  useEffect(() => {
    if (isControlled && !isDraggingPoint) {
      setInternalPolygons(controlledPolygons)
    }
  }, [isControlled, controlledPolygons, isDraggingPoint])

  const setPolygons = useCallback(
    (newPolygons: Polygon[]) => {
      if (!isControlled) {
        setInternalPolygons(newPolygons)
      }
      onPolygonsChange?.(newPolygons)
    },
    [isControlled, onPolygonsChange]
  )

  const isAddingPolygon = activeTool === 'polygon'
  const isAddingLine = activeTool === 'line'

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

  const handleClear = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
    setImageUrl(null)
    setPolygons([])
    setCurrentPoints([])
    setActiveTool('select')
    setSelectedLinePoints(null)
    if (inputRef.current) {
      inputRef.current.value = ''
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
    setPolygons(polygons.slice(0, -1))
  }, [polygons, setPolygons])

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

      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <Scene
          imageUrl={imageUrl}
          aspectRatio={aspectRatio}
          showGrid={showGrid}
          gridSize={gridSize}
          backgroundColor={backgroundColor}
          isAddingPolygon={isAddingPolygon}
          isAddingLine={isAddingLine}
          selectedLinePoints={selectedLinePoints}
          polygons={polygons}
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
          orbitControlsRef={orbitControlsRef}
          isDraggingPoint={isDraggingPoint}
        />
      </Canvas>

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
    </div>
  )
}
