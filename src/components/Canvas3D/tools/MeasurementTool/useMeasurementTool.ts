import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn, MeasurementToolState } from '../types'
import { PLANE_WIDTH } from '../../constants'
import { useCanvasContext } from '../../context/CanvasContext'
import { useToolContext } from '../../context/ToolContext'

export interface MeasurementToolExtended extends ToolHookReturn<MeasurementToolState> {
  handleCopyMeasurement: () => void
  handleClearMeasurement: () => void
}

export function useMeasurementTool(): MeasurementToolExtended {
  const { imageWidth, pixelsPerMeter } = useCanvasContext()
  const {
    measurementPoints,
    setMeasurementPoints,
    measurementCopyFeedback,
    setMeasurementCopyFeedback,
  } = useToolContext()

  // Calculate distance in meters based on pixelsPerMeter
  const measuredDistance = useMemo(() => {
    if (measurementPoints.length !== 2 || !imageWidth || !pixelsPerMeter || pixelsPerMeter <= 0) {
      return null
    }

    // Calculate distance in Three.js units
    const distanceInUnits = measurementPoints[0].distanceTo(measurementPoints[1])

    // Convert to pixels: PLANE_WIDTH units = imageWidth pixels
    const distanceInPixels = distanceInUnits * (imageWidth / PLANE_WIDTH)

    // Convert to meters using pixelsPerMeter
    return distanceInPixels / pixelsPerMeter
  }, [measurementPoints, imageWidth, pixelsPerMeter])

  const onPlaneClick = useCallback(
    (point: THREE.Vector3) => {
      if (measurementPoints.length < 2) {
        setMeasurementPoints((prev) => [...prev, point])
      } else {
        // Reset and start new measurement
        setMeasurementPoints([point])
      }
    },
    [measurementPoints.length, setMeasurementPoints]
  )

  const handleCopyMeasurement = useCallback(() => {
    if (measuredDistance === null) return

    const value = measuredDistance.toFixed(2)
    navigator.clipboard.writeText(value).then(() => {
      setMeasurementCopyFeedback(true)
      setTimeout(() => setMeasurementCopyFeedback(false), 1500)
    })
  }, [measuredDistance, setMeasurementCopyFeedback])

  const handleClearMeasurement = useCallback(() => {
    setMeasurementPoints([])
  }, [setMeasurementPoints])

  const onCancel = useCallback(() => {
    setMeasurementPoints([])
  }, [setMeasurementPoints])

  const onDeactivate = useCallback(() => {
    setMeasurementPoints([])
  }, [setMeasurementPoints])

  const getStatusText = () => {
    if (!pixelsPerMeter) {
      return 'Calibrate pixels/meter first using the Calibration tool'
    }
    if (measurementPoints.length === 0) {
      return 'Click to place first measurement point'
    }
    if (measurementPoints.length === 1) {
      return 'Click to place second point'
    }
    return 'Measurement complete'
  }

  return {
    state: {
      measurementPoints,
      measuredDistance,
      copyFeedback: measurementCopyFeedback,
      showPanel: measurementPoints.length === 2 && measuredDistance !== null,
    },
    actions: {
      onPlaneClick,
      onCancel,
      onDeactivate,
    },
    render: {
      statusText: getStatusText(),
    },
    handleCopyMeasurement,
    handleClearMeasurement,
  }
}
