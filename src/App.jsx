import React, { useMemo, useEffect, useRef, useState } from 'react'
import ThreeTitle from './three/ThreeTitle.jsx'
import Fireworks from './effects/Fireworks.jsx'


const IMG_COUNT = 27

// utils
function shuffle(a){ const r=a.slice(); for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [r[i],r[j]]=[r[j],r[i]]} return r }
function rand(min,max){ return Math.random()*(max-min)+min }

// BSP tiling without gaps
function makeTiling(n){
  const rects=[{x:0,y:0,w:100,h:100}]
  while(rects.length<n){
    let i=0
    for(let k=1;k<rects.length;k++){
      const ak=rects[k].w*rects[k].h, ai=rects[i].w*rects[i].h
      if(ak>ai) i=k
    }
    const r=rects.splice(i,1)[0]
    const splitVert = r.w>r.h ? true : r.h>r.w ? false : Math.random()<0.5
    const t=rand(35,65)/100
    if(splitVert){
      const w1=r.w*t, w2=r.w-w1
      rects.push({x:r.x,y:r.y,w:w1,h:r.h})
      rects.push({x:r.x+w1,y:r.y,w:w2,h:r.h})
    }else{
      const h1=r.h*t, h2=r.h-h1
      rects.push({x:r.x,y:r.y,w:r.w,h:h1})
      rects.push({x:r.x,y:r.y+h1,w:r.w,h:h2})
    }
  }
  return rects.slice(0,n)
}

function ImageTile({ src, rect }) {
  const [aspect, setAspect] = useState(null)
  const [currentSrc, setCurrentSrc] = useState(src)
  const rotation = (Math.random() - 0.5) * 2

  // вычисляем вписывание без обрезки
  let fitBy = 'height'
  if (aspect != null) {
    const rectAspect = rect.w / rect.h
    fitBy = aspect >= rectAspect ? 'height' : 'width'
  }

  // пути png/gif
const gifSrc = useMemo(() => src.replace(/(\d+)\.png$/i, '$1.gif'), [src])

  const onEnter = () => setCurrentSrc(gifSrc)
  const onLeave = () => setCurrentSrc(src)

  return (
    <figure
      className="tile-abs"
      style={{
        left: `${rect.x}vw`,
        top: `${rect.y}vh`,
        width: `${rect.w}vw`,
        height: `${rect.h}vh`,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onTouchStart={onEnter}
      onTouchEnd={onLeave}
    >
      <img
        src={currentSrc}
        alt=""
        decoding="async"
        loading="eager"
        onLoad={(e) => {
          const im = e.currentTarget
          if (im.naturalHeight) setAspect(im.naturalWidth / im.naturalHeight)
        }}
        onError={(e) => {
          // если .gif отсутствует — откат к .png
          if (currentSrc.toLowerCase().endsWith('.gif')) setCurrentSrc(src)
        }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          width: fitBy === 'width' ? '100%' : 'auto',
          height: fitBy === 'height' ? '100%' : 'auto',
        }}
        className="tile-img"
      />
    </figure>
  )
}

function SpotlightImage({ pngSrc, className }) {
  const [src, setSrc] = useState(pngSrc)
  const gifSrc = useMemo(() => pngSrc.replace(/(\d+)\.png$/i, '$1.gif'), [pngSrc])

  useEffect(() => {
    // показать PNG сразу
    setSrc(pngSrc)

    // попытка предзагрузить GIF
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      // короткая пауза, чтобы пользователь увидел PNG
      setTimeout(() => alive && setSrc(gifSrc), 180)
    }
    img.onerror = () => { /* GIF нет — остаёмся на PNG */ }
    img.src = gifSrc

    return () => { alive = false }
  }, [pngSrc, gifSrc])

  return <img className={className} src={src} alt="" />
}

function AudioUI() {
  const TRACK_COUNT = 5; // 0.ogg ... 4.ogg
  const SOURCES = useMemo(() => Array.from({length: TRACK_COUNT}, (_, i) => `/audio/${i}.ogg`), [])
  const audioRef = useRef(null)
  const trackRef = useRef(0)

  const [muted, setMuted] = useState(() => (localStorage.getItem('muted') ?? 'false') === 'true')
  const [vol, setVol] = useState(() => parseFloat(localStorage.getItem('vol') ?? '0.6'))
  const [playing, setPlaying] = useState(false)

  // иконки (предзагрузка)
  useEffect(() => { new Image().src = '/images/dance.png'; new Image().src = '/images/dance.gif' }, [])

  // инициализация аудио
  useEffect(() => {
    const a = new Audio(SOURCES[0])
    a.loop = false
    a.volume = vol
    a.muted = muted
    audioRef.current = a
    trackRef.current = 0

    a.onended = () => {
      // следующий трек, пока не закончится плейлист
      if (trackRef.current < SOURCES.length - 1) {
        trackRef.current += 1
        a.src = SOURCES[trackRef.current]
        a.currentTime = 0
        a.play().catch(() => {}) // если автоплей заблокирован — разблокируется по взаимодействию
      } else {
        setPlaying(false) // плейлист завершён
      }
    }

    const tryPlay = () => {
      if (!playing) setPlaying(true)
      a.play().catch(() => {})
    }
    // автоплей + «разблокировка» по первому взаимодействию
    tryPlay()
    const unlock = () => tryPlay()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    window.addEventListener('wheel', unlock, { once: true, passive: true })

    return () => { a.pause(); audioRef.current = null }
  }, [SOURCES])

  // реакция на mute
  useEffect(() => {
    const a = audioRef.current; if (!a) return
    a.muted = muted
    localStorage.setItem('muted', String(muted))
  }, [muted])

  // реакция на громкость
  useEffect(() => {
    const a = audioRef.current; if (!a) return
    a.volume = vol
    localStorage.setItem('vol', String(vol))
    if (vol === 0 && !a.muted) a.muted = true
  }, [vol])

  // ручной рестарт плейлиста по клику на иконку при завершении
  const toggleMuteOrRestart = () => {
    if (!playing && audioRef.current) {
      // плейлист закончился — запустим снова с начала
      trackRef.current = 0
      audioRef.current.src = SOURCES[0]
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      setPlaying(true)
      return
    }
    setMuted(m => !m)
  }

  const iconSrc = (muted || vol === 0) ? '/images/dance.png' : '/images/dance.gif'

  return (
    <div className="audio-ui" onClick={(e)=>e.stopPropagation()}>
      <button
        className="audio-btn img"
        onClick={toggleMuteOrRestart}
        aria-label={muted ? 'Unmute' : 'Mute'}
        title={playing ? (muted ? 'Включить звук' : 'Выключить звук') : 'Запустить плейлист'}
      >
        <img src={iconSrc} alt="" draggable="false" />
      </button>
      <input
        className="audio-slider"
        type="range" min="0" max="1" step="0.01"
        value={vol} onChange={e => setVol(Number(e.target.value))}
        aria-label="Громкость"
      />
    </div>
  )
}


export default function App(){
  const order = useMemo(()=>shuffle(Array.from({length:IMG_COUNT},(_,i)=>`/images/${i+1}.png`)),[])
  const rects = useMemo(()=>makeTiling(IMG_COUNT),[])

  // Spotlight viewer
  const [spotlight,setSpotlight]=useState(false)
  const [idx,setIdx]=useState(0)
  const wheelAcc=useRef(0)

  useEffect(()=>{
    const onWheel=(e)=>{
      if(!spotlight){ setSpotlight(true); setIdx(0) }
      e.preventDefault()
      wheelAcc.current+=e.deltaY
      const step=100
      if(wheelAcc.current>=step){ setIdx(i=>Math.min(IMG_COUNT-1,i+1)); wheelAcc.current=0 }
      if(wheelAcc.current<=-step){ setIdx(i=>Math.max(0,i-1)); wheelAcc.current=0 }
    }
    const onKey=(e)=>{
      if(e.key==='Escape') setSpotlight(false)
      if(e.key==='ArrowRight'){ setSpotlight(true); setIdx(i=>Math.min(IMG_COUNT-1,i+1)) }
      if(e.key==='ArrowLeft'){ setSpotlight(true); setIdx(i=>Math.max(0,i-1)) }
    }
    window.addEventListener('wheel', onWheel, { passive:false })
    window.addEventListener('keydown', onKey)
    return ()=>{
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  },[spotlight])

  return (
    <div className={`page ${spotlight?'is-spotlight':''}`}>
      <img src="/images/bg.png" alt="" className="bg-canvas" aria-hidden />
      <AudioUI />
      <Fireworks />   {/* фейерверк по клику */}
      {/* 3D title overlay */}
      <div className="three-holder" aria-hidden>
        <ThreeTitle />
      </div>

      {/* collage */}
      <div className="stage">
        {order.map((src,i)=>(
          <ImageTile key={i} src={src} rect={rects[i]} />
        ))}
      </div>

      {/* viewer */}
{spotlight && (
  <div className="lightbox" onClick={()=>setSpotlight(false)}>
    <SpotlightImage pngSrc={order[idx]} className="lightbox-img" />
  </div>
)}
    </div>
  )
}
