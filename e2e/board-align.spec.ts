import { expect, test, type Page } from '@playwright/test'

/**
 * Assert NFC/AFC number headers share the same CSS grid tracks as cells:
 * column header center-x ≈ cell center-x, row header center-y ≈ cell center-y.
 */

const VIEWPORTS = [
  { width: 320, height: 568, name: 'iphone-5' },
  { width: 375, height: 667, name: 'iphone-se' },
  { width: 390, height: 844, name: 'iphone-14' },
  { width: 430, height: 932, name: 'iphone-pro-max' },
  { width: 1280, height: 800, name: 'desktop' },
] as const

async function waitForBoard(page: Page) {
  await expect(page.locator('button[data-position="0"]')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByTestId('board-grid')).toBeVisible()
}

function centerOf(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function assertHeaderCellAlignment(page: Page) {
  // Sample several columns and rows (incl. edges)
  const cols = [0, 3, 5, 9]
  const rows = [0, 2, 5, 9]

  for (const col of cols) {
    const header = page.getByTestId(`nfc-num-${col}`)
    const cell = page.locator(`button[data-position="${col}"]`) // row 0
    await expect(header).toBeVisible()
    await expect(cell).toBeVisible()
    const hb = await header.boundingBox()
    const cb = await cell.boundingBox()
    expect(hb).toBeTruthy()
    expect(cb).toBeTruthy()
    const hx = centerOf(hb!).x
    const cx = centerOf(cb!).x
    expect(Math.abs(hx - cx)).toBeLessThanOrEqual(1)
  }

  for (const row of rows) {
    const header = page.getByTestId(`afc-num-${row}`)
    const cell = page.locator(`button[data-position="${row * 10}"]`) // col 0
    await expect(header).toBeVisible()
    await expect(cell).toBeVisible()
    const hb = await header.boundingBox()
    const cb = await cell.boundingBox()
    expect(hb).toBeTruthy()
    expect(cb).toBeTruthy()
    const hy = centerOf(hb!).y
    const cy = centerOf(cb!).y
    expect(Math.abs(hy - cy)).toBeLessThanOrEqual(1)
  }
}

async function assertAfterHorizontalScroll(page: Page) {
  const scroll = page.getByTestId('board-scroll')
  const before = await scroll.evaluate((el) => el.scrollLeft)
  await scroll.evaluate((el) => {
    el.scrollLeft = Math.min(120, el.scrollWidth - el.clientWidth)
  })
  const after = await scroll.evaluate((el) => el.scrollLeft)
  // On wide desktop there may be nothing to scroll; still re-check alignment.
  if (after === before && after === 0) {
    await assertHeaderCellAlignment(page)
    return
  }
  expect(after).toBeGreaterThan(before)

  // Column headers scroll with cells → x still matches
  for (const col of [4, 8]) {
    const header = page.getByTestId(`nfc-num-${col}`)
    const cell = page.locator(`button[data-position="${col}"]`)
    const hb = await header.boundingBox()
    const cb = await cell.boundingBox()
    expect(hb).toBeTruthy()
    expect(cb).toBeTruthy()
    expect(Math.abs(centerOf(hb!).x - centerOf(cb!).x)).toBeLessThanOrEqual(1)
  }

  // Row headers sticky-left → y still matches their row
  for (const row of [1, 6]) {
    const header = page.getByTestId(`afc-num-${row}`)
    const cell = page.locator(`button[data-position="${row * 10 + 5}"]`)
    const hb = await header.boundingBox()
    const cb = await cell.boundingBox()
    expect(hb).toBeTruthy()
    expect(cb).toBeTruthy()
    expect(Math.abs(centerOf(hb!).y - centerOf(cb!).y)).toBeLessThanOrEqual(1)
  }
}

test.describe('Board header/cell alignment', () => {
  for (const vp of VIEWPORTS) {
    test(`aligned with numbers @ ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await waitForBoard(page)
      await assertHeaderCellAlignment(page)
      await assertAfterHorizontalScroll(page)
    })

    test(`aligned with ? placeholders @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/?mock_numbers=blank')
      await waitForBoard(page)
      await expect(page.getByTestId('nfc-num-0')).toHaveText('?')
      await expect(page.getByTestId('afc-num-0')).toHaveText('?')
      await assertHeaderCellAlignment(page)
    })

    test(`aligned after randomize (alt) @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/?mock_numbers=alt')
      await waitForBoard(page)
      await expect(page.getByTestId('nfc-num-0')).toHaveText('0')
      await expect(page.getByTestId('afc-num-0')).toHaveText('9')
      await assertHeaderCellAlignment(page)
      await assertAfterHorizontalScroll(page)
    })
  }
})
