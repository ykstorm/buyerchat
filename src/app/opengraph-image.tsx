import { ImageResponse } from 'next/og'

// Root OG card (homesty.ai/) — used for share previews on the homepage.
// Brand: ink-black surface, cream foreground, single italic gold accent
// word per Homesty_DESIGN.md §1-3. We fetch Cormorant Garamond from the
// Google Fonts CDN so the italic accent actually renders (Satori has no
// default fonts beyond an embedded sans).
export const runtime = 'edge'
export const alt = 'Homesty.ai — Honesty is rare. It comes with Homesty.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#1C1917'
const CREAM = '#FAFAF8'
const GOLD = '#C49B50'
const MUTED = '#A8A29E'

async function loadCormorant(): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400&display=swap'
    const css = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    }).then(r => r.text())
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/)
    if (!match) return null
    const fontRes = await fetch(match[1])
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

export default async function OGImage() {
  const fontData = await loadCormorant()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: INK,
          color: CREAM,
          padding: 80,
          fontFamily: '"Cormorant Garamond", serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: GOLD,
            letterSpacing: 6,
            fontFamily: 'sans-serif',
            fontWeight: 600,
          }}
        >
          HOMESTY.AI
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 96,
            marginTop: 56,
            fontStyle: 'italic',
            lineHeight: 1.05,
            color: CREAM,
          }}
        >
          Honesty is <span style={{ color: GOLD, marginLeft: 24 }}>rare.</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontStyle: 'italic',
            lineHeight: 1.05,
            color: CREAM,
            marginTop: 8,
          }}
        >
          It comes with Homesty.
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 26,
            marginTop: 'auto',
            color: MUTED,
            fontFamily: 'sans-serif',
            fontWeight: 400,
          }}
        >
          South Bopal &amp; Shela · RERA-verified · Ahmedabad
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: 'Cormorant Garamond',
              data: fontData,
              style: 'italic',
              weight: 400,
            },
          ]
        : undefined,
    }
  )
}
