import { GridStackEngine, type GridStackNode } from 'gridstack'

export class OverlapGridStackEngine extends GridStackEngine {
  override collide(
    _skip: GridStackNode,
    _area?: GridStackNode,
    _skip2?: GridStackNode,
  ): undefined {
    return undefined
  }

  override collideAll(
    _skip: GridStackNode,
    _area?: GridStackNode,
    _skip2?: GridStackNode,
  ): GridStackNode[] {
    return []
  }
}
