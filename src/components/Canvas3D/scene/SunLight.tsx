import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import SunCalc from 'suncalc'

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

export interface SunLightProps {
  timeOfDay: number
  shadows: boolean
  latitude?: number
  longitude?: number
  date?: Date
}

export function SunLight({ timeOfDay, shadows, latitude, longitude, date }: SunLightProps) {
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
