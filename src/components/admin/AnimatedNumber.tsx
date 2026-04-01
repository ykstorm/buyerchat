'use client'
import { useEffect, useState } from 'react'
export default function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const duration = 1000
    const frame = () => {
      const progress = Math.min((Date.now()-start)/duration, 1)
      const eased = 1-Math.pow(1-progress, 3)
      setDisplay(Math.round(eased*value))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [value])
  return <>{display}</>
}
