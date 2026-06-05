import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadCsv } from './exportCsv'

describe('downloadCsv', () => {
  let capturedBlob

  beforeEach(() => {
    capturedBlob = null
    // jsdom doesn't implement object URLs — stub them and capture the Blob.
    globalThis.URL.createObjectURL = vi.fn((blob) => {
      capturedBlob = blob
      return 'blob:mock'
    })
    globalThis.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('builds CSV from headers + rows and triggers a download', async () => {
    downloadCsv('out.csv', ['A', 'B'], [['1', '2'], ['3', '4']])

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1)

    const text = await capturedBlob.text()
    expect(text).toContain('A,B')
    expect(text).toContain('1,2')
    expect(text).toContain('3,4')
  })

  it('escapes values containing commas and quotes (RFC 4180)', async () => {
    downloadCsv('out.csv', ['Name'], [['Smith, John'], ['She said "hi"']])
    const text = await capturedBlob.text()
    expect(text).toContain('"Smith, John"')
    expect(text).toContain('"She said ""hi"""')
  })
})
