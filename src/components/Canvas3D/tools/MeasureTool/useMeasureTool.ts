import { useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn } from '../types'
import { PLANE_WIDTH } from '../../constants'

export interface UseMeasureToolOptions {
  measurePoints: THREE.Vector3[]
  setMeasurePoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>
  imageWidth: number | null
}

export function useMeasureTool({
  measurePoints,
  setMeasurePoints,
  imageWidth,
}: UseMeasureToolOptions): ToolHookReturn {
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

  const onPlaneClick = useCallback(
    (point: THREE.Vector3) => {
      if (measurePoints.length < 2) {
        setMeasurePoints((prev) => [...prev, point])
      } else {
        // Reset and start new measurement
        setMeasurePoints([point])
      }
    },
    [measurePoints.length, setMeasurePoints]
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
  }, [setMeasurePoints])

  const onCancel = useCallback(() => {
    setMeasurePoints([])
  }, [setMeasurePoints])

  const getStatusText = () => {
    if (measurePoints.length === 0) {
      return 'Click to place first point on a known object'
    }
    if (measurePoints.length === 1) {
      return 'Click to place second point'
    }
    return 'Measurement complete • Adjust known length below'
  }

  return {
    state: {
      measurePoints,
      knownLength,
      calculatedPixelsPerMeter,
      copyFeedback,
      showPanel: measurePoints.length === 2,
    },
    actions: {
      onPlaneClick,
      onCancel,
    },
    render: {
      SceneElements: null, // Scene elements rendered via Scene component
      UIElements: null, // UI handled separately
      statusText: getStatusText(),
    },
    setKnownLength,
    handleCopyPixelsPerMeter,
    handleClearMeasurement,
  } as ToolHookReturn & {
    setKnownLength: (length: number) => void
    handleCopyPixelsPerMeter: () => void
    handleClearMeasurement: () => void
  }
}
