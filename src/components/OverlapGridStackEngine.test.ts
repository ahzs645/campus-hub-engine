import { describe, expect, it } from 'vitest'
import type { GridStackNode } from 'gridstack'
import { OverlapGridStackEngine } from './OverlapGridStackEngine'

const positionOf = (node: GridStackNode) => ({
  x: node.x,
  y: node.y,
  w: node.w,
  h: node.h,
})

describe('OverlapGridStackEngine', () => {
  it('retains intersecting coordinates while adding and moving nodes', () => {
    const engine = new OverlapGridStackEngine({
      column: 12,
      float: true,
    })
    const back = engine.addNode({
      id: 'back',
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    })
    const front = engine.addNode({
      id: 'front',
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    })

    expect(positionOf(back)).toEqual({ x: 0, y: 0, w: 4, h: 3 })
    expect(positionOf(front)).toEqual({ x: 0, y: 0, w: 2, h: 2 })

    expect(engine.moveNode(front, { x: 1, y: 1, w: 3, h: 2 })).toBe(true)
    expect(positionOf(back)).toEqual({ x: 0, y: 0, w: 4, h: 3 })
    expect(positionOf(front)).toEqual({ x: 1, y: 1, w: 3, h: 2 })
  })
})
