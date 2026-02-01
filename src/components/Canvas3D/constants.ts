export const OUTLINE_HEIGHT = 0.01
export const POINT_SIZE = 0.05
export const POINT_SIZE_HOVER = 0.07
export const BASE_CAMERA_DISTANCE = 8 // Reference distance for point size scaling
export const PLANE_WIDTH = 5
export const MIN_DISTANCE_FROM_POINT = 0.15

export const COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff']

// Roof type defaults
export const DEFAULT_ROOF_TYPE = 'flat' as const
export const DEFAULT_ROOF_PITCH = 30 // degrees
export const DEFAULT_ROOF_ROTATION = 0 // degrees
export const MANSARD_LOWER_PITCH = 70 // steep lower section (degrees)
export const MANSARD_UPPER_PITCH = 30 // gentle upper section (degrees)
export const MANSARD_BREAK_RATIO = 0.5 // where the slope changes (50% of height)

// Roof type display labels for UI
export const ROOF_TYPE_LABELS: Record<string, string> = {
  flat: 'Flat',
  pitched: 'Pitched',
  tented: 'Tented (Pyramidal)',
  hipped: 'Hipped',
  'half-hip': 'Half-Hip',
  gabled: 'Gabled',
  mansard: 'Mansard',
}
