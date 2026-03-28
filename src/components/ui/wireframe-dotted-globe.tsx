"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

// Module-level cache — survives re-renders and client-side navigation
let dotCache: { lng: number; lat: number }[] | null = null

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

export default function RotatingEarth({ width = 800, height = 600, className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const containerWidth = Math.min(width, window.innerWidth - 40)
    const containerHeight = Math.min(height, window.innerHeight - 100)
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const allDots: { lng: number; lat: number }[] = []
    const rotation: [number, number] = [0, 0]
    let autoRotate = true

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight)
      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#0d0d0d"
      context.fill()
      context.strokeStyle = "rgba(255,255,255,0.12)"
      context.lineWidth = 1.5 * scaleFactor
      context.stroke()

      if (!allDots.length) return

      const rot = projection.rotate()
      const center: [number, number] = [-rot[0], -rot[1]]

      allDots.forEach((dot) => {
        if (d3.geoDistance([dot.lng, dot.lat], center) > Math.PI / 2) return
        const projected = projection([dot.lng, dot.lat])
        if (
          projected &&
          projected[0] >= 0 &&
          projected[0] <= containerWidth &&
          projected[1] >= 0 &&
          projected[1] <= containerHeight
        ) {
          context.beginPath()
          context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI)
          context.fillStyle = "#2c5ceb"
          context.fill()
        }
      })
    }

    const rotationTimer = d3.timer(() => {
      if (autoRotate) {
        rotation[0] += 0.08
        projection.rotate(rotation)
        render()
      }
    })

    // Load dots via worker, use cache if available
    if (dotCache) {
      allDots.push(...dotCache)
    } else {
      const worker = new Worker("/globe-worker.js")
      worker.onmessage = (e) => {
        worker.terminate()
        if (e.data.dots) {
          dotCache = e.data.dots
          allDots.push(...e.data.dots)
          render()
        } else {
          setError("Failed to load map data")
        }
      }
      worker.onerror = () => { worker.terminate(); setError("Failed to load map data") }
      worker.postMessage(null)
    }

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        rotation[0] = startRotation[0] + dx * 0.5
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - dy * 0.5))
        projection.rotate(rotation)
        render()
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        setTimeout(() => { autoRotate = true }, 10)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const sf = event.deltaY > 0 ? 0.9 : 1.1
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * sf))
      projection.scale(newRadius)
      render()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel)

    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [width, height])

  if (error) {
    return (
      <div className={`dark flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="dark text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="dark text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-2xl"
        style={{ maxWidth: "100%", height: "auto", background: "#0d0d0d" }}
      />
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground px-2 py-1 rounded-md dark bg-neutral-900">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}
