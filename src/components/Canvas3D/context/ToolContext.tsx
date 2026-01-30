import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolName } from '../types'

export interface ToolContextValue {
  // Active tool
  activeTool: ToolName
  setActiveTool: (tool: ToolName) => void

  // Tool state flags
  isAddingPolygon: boolean
  isAddingLine: boolean
  isAddingBody: boolean
  isMeasuring: boolean

  // Selected line points (for line tool)
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  setSelectedLinePoints: (points: { polygonId: string; pointIndex: number } | null) => void

  // Polygon tool state
  currentPoints: THREE.Vector3[]
  setCurrentPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>

  // Measure tool state
  measurePoints: THREE.Vector3[]
  setMeasurePoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>

  // Tool switching helper
  handleSelectTool: (tool: ToolName) => void
}

const ToolContext = createContext<ToolContextValue | null>(null)

export interface ToolProviderProps {
  children: React.ReactNode
}

export function ToolProvider({ children }: ToolProviderProps) {
  const [activeTool, setActiveTool] = useState<ToolName>('select')
  const [selectedLinePoints, setSelectedLinePoints] = useState<{
    polygonId: string
    pointIndex: number
  } | null>(null)
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([])
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([])

  const isAddingPolygon = activeTool === 'polygon'
  const isAddingLine = activeTool === 'line'
  const isAddingBody = activeTool === 'body'
  const isMeasuring = activeTool === 'measure'

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

  const value = useMemo<ToolContextValue>(() => ({
    activeTool,
    setActiveTool,
    isAddingPolygon,
    isAddingLine,
    isAddingBody,
    isMeasuring,
    selectedLinePoints,
    setSelectedLinePoints,
    currentPoints,
    setCurrentPoints,
    measurePoints,
    setMeasurePoints,
    handleSelectTool,
  }), [
    activeTool,
    isAddingPolygon,
    isAddingLine,
    isAddingBody,
    isMeasuring,
    selectedLinePoints,
    currentPoints,
    measurePoints,
    handleSelectTool,
  ])

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  )
}

export function useToolContext(): ToolContextValue {
  const context = useContext(ToolContext)
  if (!context) {
    throw new Error('useToolContext must be used within a ToolProvider')
  }
  return context
}

export function useToolContextOptional(): ToolContextValue | null {
  return useContext(ToolContext)
}
