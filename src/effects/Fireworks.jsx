import React, { useEffect, useRef } from 'react'

export default function Fireworks() {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const partsRef = useRef([])
  const rafRef = useRef(0)
  const dprRef = useRef(1)

  useEffect(() => {
    const cvs = canvasRef.current
    const ctx = cvs.getContext('2d')
    ctxRef.current = ctx

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      dprRef.current = dpr
      cvs.width = Math.floor(window.innerWidth * dpr)
      cvs.height = Math.floor(window.innerHeight * dpr)
      cvs.style.width = '100%'; cvs.style.height = '100%'
      // сброс матрицы и масштаб для DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['#ff4fd1','#ffd166','#06d6a0','#118ab2','#ef476f','#7c4dff']
    const GRAV = 0.12
    const FRICTION = 0.992

    function burst(x, y) {
      const P = partsRef.current
      const n = 90
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.1
        const spd = 3 + Math.random() * 3.5
        P.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.2,
          life: 60 + Math.floor(Math.random() * 40),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 2,
          alpha: 1
        })
      }
      if (P.length > 3000) P.splice(0, P.length - 3000)
    }

    const onClick = (e) => burst(e.clientX, e.clientY)
    window.addEventListener('click', onClick)

    const loop = () => {
      const ctx = ctxRef.current
      const P = partsRef.current
      const w = window.innerWidth
      const h = window.innerHeight

      // ПРОЗРАЧНОЕ затухание: стираем часть предыдущего кадра
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 0.18           // величина «стирания»
      ctx.fillStyle = '#000'           // цвет не важен для destination-out
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1.0

      // рисуем искры со сложением цвета
      ctx.globalCompositeOperation = 'lighter'
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]
        p.vx *= FRICTION
        p.vy = p.vy * FRICTION + GRAV
        p.x += p.vx
        p.y += p.vy
        p.life -= 1
        p.alpha = Math.max(0, p.life / 80)

        if (p.alpha <= 0) { P.splice(i, 1); continue }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hexToRgb(p.color)},${p.alpha})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('click', onClick)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 6000,
        pointerEvents: 'none',           // клики проходят
        background: 'transparent'
      }}
      aria-hidden
    />
  )
}

function hexToRgb(hex) {
  const n = hex.startsWith('#') ? hex.slice(1) : hex
  const i = parseInt(n.length === 3 ? n.split('').map(c=>c+c).join('') : n, 16)
  const r = (i >> 16) & 255, g = (i >> 8) & 255, b = i & 255
  return `${r},${g},${b}`
}
