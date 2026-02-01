export { createRoofGeometry } from './RoofGeometryFactory'
export type { RoofGeometryParams, RoofGeometryResult, PolygonAnalysis } from './types'
export {
  analyzePolygon,
  calculateRoofHeight,
  getRidgeLine,
  projectToRidgeLine,
  getRidgeSide,
} from './utils/polygonAnalysis'
