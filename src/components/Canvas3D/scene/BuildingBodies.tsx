import type { Body } from '../types'
import { BuildingBody } from './BuildingBody'

export interface BuildingBodiesProps {
  bodies: Body[]
  isAddingBody: boolean
  imageUrl: string | null
  aspectRatio: number
  castShadow: boolean
  onDeleteBody: (bodyId: string) => void
}

export function BuildingBodies({ bodies, isAddingBody, imageUrl, aspectRatio, castShadow, onDeleteBody }: BuildingBodiesProps) {
  return (
    <>
      {bodies.map((body) => {
        // Skip hidden bodies
        if (body.visible === false) return null

        return (
          <BuildingBody
            key={body.id}
            body={body}
            isAddingBody={isAddingBody}
            imageUrl={imageUrl}
            aspectRatio={aspectRatio}
            castShadow={castShadow}
            onDelete={() => onDeleteBody(body.id)}
          />
        )
      })}
    </>
  )
}
