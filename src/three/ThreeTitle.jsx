import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Text } from 'troika-three-text'

const TITLE = `Happy Birthday\n27 level (╯°□°)╯(┻━┻)`
const OUTLINE_HEX = 0x000000
const RAINBOW_SPEED = 0.12
const RAINBOW_SAT = 0.9
const RAINBOW_LUM = 0.58

export default function ThreeTitle(){
  const mountRef = useRef(null)

  useEffect(()=>{
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000)
    camera.position.set(0, 0, 28)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.6
    mount.appendChild(renderer.domElement)

    // свет
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(7,10,10); scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-6,-4,9); scene.add(fill)
    const spec = new THREE.PointLight(0xffffff, 1.6, 60); scene.add(spec)

    // контур — отдельный слой, цвет фикс
    const outlineText = new Text()
    outlineText.text = TITLE
    outlineText.font = '/fonts/MountainsofChristmas-Regular.ttf'
    outlineText.fontSize = 6
    outlineText.anchorX = 'center'
    outlineText.anchorY = 'middle'
    outlineText.lineHeight = 0.9
    outlineText.maxWidth = 30
    outlineText.fillOpacity = 0
    outlineText.outlineWidth = 0.22
    outlineText.outlineBlur = 0.008
    outlineText.outlineColor = OUTLINE_HEX
    outlineText.outlineOpacity = 1
    outlineText.material = new THREE.MeshBasicMaterial({ color: 0xffffff })
    outlineText.renderOrder = 1
    outlineText.sync()
    scene.add(outlineText)

    // заливка — отдельный слой, меняем цвет по радуге
    const fillText = new Text()
    fillText.text = TITLE
    fillText.font = '/fonts/MountainsofChristmas-Bold.ttf'
    fillText.fontSize = 6
    fillText.anchorX = 'center'
    fillText.anchorY = 'middle'
    fillText.lineHeight = 0.9
    fillText.maxWidth = 30
    fillText.outlineWidth = 0

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      emissive: new THREE.Color(0,0,0),
      emissiveIntensity: 0.35
    })
    fillText.material = mat
    fillText.color = 0xffffff
    fillText.position.z = 0.001
    fillText.renderOrder = 2
    fillText.sync()
    scene.add(fillText)

    // радуга по HSL только для заливки
    const hsl = new THREE.Color()
    let t0 = performance.now(), raf

    const render = ()=>{
      const t = (performance.now() - t0) / 1000

      const hue = (t * RAINBOW_SPEED) % 1
      hsl.setHSL(hue, RAINBOW_SAT, RAINBOW_LUM)
      fillText.color = hsl.getHex()
      mat.emissive.copy(hsl).multiplyScalar(0.5)

      // блик + лёгкое покачивание
      const r = 9
      spec.position.set(Math.cos(t*1.0)*r, Math.sin(t*1.3)*(r*0.6), 9 + Math.sin(t*0.9)*3)
      outlineText.rotation.y = fillText.rotation.y = Math.sin(t * 0.4) * 0.06
      outlineText.rotation.x = fillText.rotation.x = Math.sin(t * 0.3) * 0.04

      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }
    render()

    const onResize = ()=>{
      const w2 = mount.clientWidth, h2 = mount.clientHeight
      renderer.setSize(w2, h2)
      camera.aspect = w2/h2
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return ()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (renderer.domElement?.parentNode === mount) mount.removeChild(renderer.domElement)
      outlineText.dispose()
      fillText.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{position:'absolute', inset:0}} />
}
