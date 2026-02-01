import type { RoofType } from '../../types'
import type { RoofGeometryParams, RoofGeometryResult } from './types'
import { createFlatRoofGeometry } from './geometry/FlatRoofGeometry'
import { createGabledRoofGeometry } from './geometry/GabledRoofGeometry'
import { createPitchedRoofGeometry } from './geometry/PitchedRoofGeometry'
import { createHippedRoofGeometry } from './geometry/HippedRoofGeometry'
import { createTentedRoofGeometry } from './geometry/TentedRoofGeometry'
import { createHalfHipRoofGeometry } from './geometry/HalfHipRoofGeometry'
import { createMansardRoofGeometry } from './geometry/MansardRoofGeometry'

export function createRoofGeometry(
  roofType: RoofType,
  params: RoofGeometryParams
): RoofGeometryResult {
  switch (roofType) {
    case 'flat':
      return createFlatRoofGeometry(params)
    case 'gabled':
      return createGabledRoofGeometry(params)
    case 'pitched':
      return createPitchedRoofGeometry(params)
    case 'hipped':
      return createHippedRoofGeometry(params)
    case 'tented':
      return createTentedRoofGeometry(params)
    case 'half-hip':
      return createHalfHipRoofGeometry(params)
    case 'mansard':
      return createMansardRoofGeometry(params)
    default:
      return createFlatRoofGeometry(params)
  }
}
