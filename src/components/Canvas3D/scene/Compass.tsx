import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export interface CompassProps {
  onRotationChange: (angle: number) => void
}

export function Compass({ onRotationChange }: CompassProps) {
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
