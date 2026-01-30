import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn } from '../types'
import { PLANE_WIDTH } from '../../constants'
import { useCanvasContext } from '../../context/CanvasContext'
import { useToolContext } from '../../context/ToolContext'

export interface MeasureToolExtended extends ToolHookReturn {
  setKnownLength: (length: number) => void
  handleCopyPixelsPerMeter: () => void
  handleClearMeasurement: () => void
}

export function useMeasureTool(): MeasureToolExtended {
  const { imageWidth } = useCanvasContext()
  const {
    measurePoints,
    setMeasurePoints,
    knownLength,
    setKnownLength,
    copyFeedback,
    setCopyFeedback,
  } = useToolContext()

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
  }, [calculatedPixelsPerMeter, setCopyFeedback])

  const handleClearMeasurement = useCallback(() => {
    setMeasurePoints([])
  }, [setMeasurePoints])

  const onCancel = useCallback(() => {
    setMeasurePoints([])
  }, [setMeasurePoints])

  const onDeactivate = useCallback(() => {
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
      onDeactivate,
    },
    render: {
      statusText: getStatusText(),
    },
    setKnownLength: (length: number) => setKnownLength(length),
    handleCopyPixelsPerMeter,
    handleClearMeasurement,
  }
}