import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolName } from '../types'

export interface ToolContextValue {
  // Active tool
  activeTool: ToolName
  setActiveTool: (tool: ToolName) => void

  // Selected line points (for line tool)
  selectedLinePoints: { polygonId: string; pointIndex: number } | null
  setSelectedLinePoints: (points: { polygonId: string; pointIndex: number } | null) => void

  // Polygon tool state
  currentPoints: THREE.Vector3[]
  setCurrentPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>

  // Calibration tool state
  calibrationPoints: THREE.Vector3[]
  setCalibrationPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>
  knownLength: number
  setKnownLength: React.Dispatch<React.SetStateAction<number>>
  copyFeedback: boolean
  setCopyFeedback: React.Dispatch<React.SetStateAction<boolean>>

  // Measurement tool state
  measurementPoints: THREE.Vector3[]
  setMeasurementPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>
  measurementCopyFeedback: boolean
  setMeasurementCopyFeedback: React.Dispatch<React.SetStateAction<boolean>>

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
  const [calibrationPoints, setCalibrationPoints] = useState<THREE.Vector3[]>([])
  const [knownLength, setKnownLength] = useState<number>(4.5)
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false)
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([])
  const [measurementCopyFeedback, setMeasurementCopyFeedback] = useState<boolean>(false)

  const handleSelectTool = useCallback((tool: ToolName) => {
    if (activeTool === 'polygon' && currentPoints.length > 0) {
      setCurrentPoints([])
    }
    if (activeTool === 'calibration') {
      setCalibrationPoints([])
    }
    if (activeTool === 'measurement') {
      setMeasurementPoints([])
    }
    setSelectedLinePoints(null)
    setActiveTool(tool)
  }, [activeTool, currentPoints.length])

  const value = useMemo<ToolContextValue>(() => ({
    activeTool,
    setActiveTool,
    selectedLinePoints,
    setSelectedLinePoints,
    currentPoints,
    setCurrentPoints,
    calibrationPoints,
    setCalibrationPoints,
    knownLength,
    setKnownLength,
    copyFeedback,
    setCopyFeedback,
    measurementPoints,
    setMeasurementPoints,
    measurementCopyFeedback,
    setMeasurementCopyFeedback,
    handleSelectTool,
  }), [
    activeTool,
    selectedLinePoints,
    currentPoints,
    calibrationPoints,
    knownLength,
    copyFeedback,
    measurementPoints,
    measurementCopyFeedback,
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
