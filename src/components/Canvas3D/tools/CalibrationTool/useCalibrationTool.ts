import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ToolHookReturn, CalibrationToolState } from '../types'
import { PLANE_WIDTH } from '../../constants'
import { useCanvasContext } from '../../context/CanvasContext'
import { useToolContext } from '../../context/ToolContext'

export interface CalibrationToolExtended extends ToolHookReturn<CalibrationToolState> {
  setKnownLength: (length: number) => void
  handleCopyPixelsPerMeter: () => void
  handleClearCalibration: () => void
}

export function useCalibrationTool(): CalibrationToolExtended {
  const { imageWidth } = useCanvasContext()
  const {
    calibrationPoints,
    setCalibrationPoints,
    knownLength,
    setKnownLength,
    copyFeedback,
    setCopyFeedback,
  } = useToolContext()

  // Dynamic calculation of pixels per meter
  const calculatedPixelsPerMeter = useMemo(() => {
    if (calibrationPoints.length !== 2 || !imageWidth || knownLength <= 0) return null

    // Calculate distance in Three.js units
    const distanceInUnits = calibrationPoints[0].distanceTo(calibrationPoints[1])

    // Convert to pixels: PLANE_WIDTH units = imageWidth pixels
    const distanceInPixels = distanceInUnits * (imageWidth / PLANE_WIDTH)

    // Calculate pixels per meter
    return distanceInPixels / knownLength
  }, [calibrationPoints, imageWidth, knownLength])

  const onPlaneClick = useCallback(
    (point: THREE.Vector3) => {
      if (calibrationPoints.length < 2) {
        setCalibrationPoints((prev) => [...prev, point])
      } else {
        // Reset and start new calibration
        setCalibrationPoints([point])
      }
    },
    [calibrationPoints.length, setCalibrationPoints]
  )

  const handleCopyPixelsPerMeter = useCallback(() => {
    if (calculatedPixelsPerMeter === null) return

    const value = calculatedPixelsPerMeter.toFixed(2)
    navigator.clipboard.writeText(value).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 1500)
    })
  }, [calculatedPixelsPerMeter, setCopyFeedback])

  const handleClearCalibration = useCallback(() => {
    setCalibrationPoints([])
  }, [setCalibrationPoints])

  const onCancel = useCallback(() => {
    setCalibrationPoints([])
  }, [setCalibrationPoints])

  const onDeactivate = useCallback(() => {
    setCalibrationPoints([])
  }, [setCalibrationPoints])

  const getStatusText = () => {
    if (calibrationPoints.length === 0) {
      return 'Click to place first point on a known object'
    }
    if (calibrationPoints.length === 1) {
      return 'Click to place second point'
    }
    return 'Calibration complete • Adjust known length below'
  }

  return {
    state: {
      calibrationPoints,
      knownLength,
      calculatedPixelsPerMeter,
      copyFeedback,
      showPanel: calibrationPoints.length === 2,
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
    handleClearCalibration,
  }
}
