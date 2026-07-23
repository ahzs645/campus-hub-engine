import { describe, expect, it } from 'vitest'
import { buildConfigThumbnailSvg } from './config-thumbnail'

describe('buildConfigThumbnailSvg stacking', () => {
  it('emits overlapping widgets back-to-front by z-index', () => {
    const svg = buildConfigThumbnailSvg({
      layout: [
        {
          id: 'front',
          type: 'front-layer',
          x: 0,
          y: 0,
          w: 12,
          h: 8,
          zIndex: 10,
        },
        {
          id: 'back',
          type: 'back-layer',
          x: 0,
          y: 0,
          w: 12,
          h: 8,
          zIndex: 0,
        },
      ],
    })

    expect(svg.indexOf('Back Layer')).toBeLessThan(svg.indexOf('Front Layer'))
  })
})
