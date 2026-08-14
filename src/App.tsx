import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Spatial } from '@webspatial/core-sdk'
import { QuietRoom, type ActivityId, type RoomEvent } from './room'

const activities: Array<{ id: ActivityId; icon: string; title: string; hint: string; number: string }> = [
  { id: 'shelf', icon: '▥', title: '整理书架', hint: '纸页与木格', number: '01' },
  { id: 'repair', icon: '◷', title: '修复旧钟', hint: '齿轮与黄铜', number: '02' },
  { id: 'water', icon: '♧', title: '给植物浇水', hint: '水珠与陶土', number: '03' },
  { id: 'record', icon: '◎', title: '擦拭唱片', hint: '唱片架与绒布', number: '04' },
  { id: 'collection', icon: '◇', title: '摆放收藏', hint: '陶瓷与木头', number: '05' },
  { id: 'desk', icon: '▱', title: '收拾桌面', hint: '旧纸与留白', number: '06' },
]

const events: Record<ActivityId, RoomEvent> = {
  shelf: { id: 'shelf', label: '书脊轻轻归位', detail: '木格与纸页发出柔和的沙沙声。' },
  repair: { id: 'repair', label: '旧钟重新呼吸', detail: '小齿轮传来干净而克制的咔嗒声。' },
  water: { id: 'water', label: '叶片接住水珠', detail: '水落进陶土，叶片慢慢舒展开来。' },
  record: { id: 'record', label: '唱片回到唱片机旁', detail: '纸套轻响，绒布沿沟槽带走一整圈浮尘。' },
  collection: { id: 'collection', label: '收藏品找到位置', detail: '陶瓷、木头与金属各自安静下来。' },
  desk: { id: 'desk', label: '桌面留出空白', detail: '纸张的边缘被一遍遍轻轻理齐。' },
}

const spatialStyle = (depth: number, material = 'thin') => ({
  '--xr-back': `${depth}`,
  '--xr-background-material': material,
}) as CSSProperties

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const roomRef = useRef<QuietRoom | null>(null)
  const [spatialMode, setSpatialMode] = useState(false)
  const [musicOn, setMusicOn] = useState(false)
  const [event, setEvent] = useState<RoomEvent>({ id: 'desk', label: '今晚，不必完成什么', detail: '挑一件顺手的小事，或者只是坐下来听雨。' })
  const [active, setActive] = useState<ActivityId | null>(null)
  const [ritual, setRitual] = useState<ActivityId | null>(null)

  useEffect(() => {
    try { setSpatialMode(new Spatial().runInSpatialWeb()) } catch { setSpatialMode(false) }
    if (!canvasRef.current) return
    const room = new QuietRoom(canvasRef.current, id => setRitual(id))
    roomRef.current = room
    return () => room.destroy()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (spatialMode || params.get('pico-spatial-launch') !== '1') return
    if (!/PicoBrowser|PicoWebApp/i.test(navigator.userAgent)) return
    const target = new URL(window.location.href)
    target.searchParams.delete('pico-spatial-launch')
    const config = JSON.stringify({ type: 'window', defaultSize: { width: '1600px', height: '1000px' }, worldScaling: 'automatic', worldAlignment: 'adaptive' })
    const spatialUrl = `webspatial://createSpatialScene?url=${encodeURIComponent(target.toString())}&config=${encodeURIComponent(config)}`
    const timer = window.setTimeout(() => window.open(spatialUrl, '_blank'), 420)
    return () => window.clearTimeout(timer)
  }, [spatialMode])

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    void roomRef.current?.setAmbient(next)
  }

  const completeRitual = (id: ActivityId) => {
    roomRef.current?.trigger(id)
    setEvent(events[id])
    setActive(id)
    setRitual(null)
    window.setTimeout(() => setActive(current => current === id ? null : current), 1900)
  }

  return (
    <main className="app">
      <div className="scene" enable-xr="true" style={spatialStyle(148, 'transparent')}>
        <canvas ref={canvasRef} aria-label="雨夜放松整理屋三维场景" />
        <div className="cinematic-light" />
        <div className="scene-shade" />
      </div>

      <header className="header" enable-xr="true" style={spatialStyle(42)}>
        <a className="identity" href="#room" aria-label="静栖放松整理屋">
          <span>静</span><p><b>静栖</b><small>QUIET TIDY HOUSE</small></p>
        </a>
        <div className="room-state"><i /><span>雨夜小屋</span><em>自由整理</em></div>
        <button className={`music-control ${musicOn ? 'playing' : ''}`} onClick={toggleMusic} aria-pressed={musicOn}>
          <div className="music-bars"><i /><i /><i /><i /></div>
          <p><small>{musicOn ? 'NOW PLAYING' : 'GENERATIVE SOUNDSCAPE'}</small><b>{musicOn ? '雨檐与灯火' : '播放雨夜音乐'}</b></p>
          <span>{musicOn ? 'Ⅱ' : '▶'}</span>
        </button>
      </header>

      <section className="hero-copy" id="room" enable-xr="true" style={spatialStyle(70)}>
        <small>NO SCORES · NO FAILURE · NO RUSH</small>
        <h1>让房间<br/><em>慢慢安静</em></h1>
        <p>没有清单，也没有完成度。<br/>只听手边的物件，回到它们合适的位置。</p>
      </section>

      <div className={`response ${active ? 'visible' : ''}`} enable-xr="true" style={spatialStyle(112)} role="status">
        <span>{activities.find(item => item.id === event.id)?.icon}</span>
        <p><small>THE ROOM RESPONDS</small><b>{event.label}</b><em>{event.detail}</em></p>
      </div>

      <section className="ritual-dock" enable-xr="true" style={spatialStyle(92)} aria-label="整理活动">
        <div className="dock-intro"><small>CHOOSE ONE</small><b>随手做一点</b><span>随时停下也很好</span></div>
        <div className="activity-row">
          {activities.map(item => (
            <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => setRitual(item.id)}>
              <small>{item.number}</small><span>{item.icon}</span><p><b>{item.title}</b><em>{item.hint}</em></p>
            </button>
          ))}
        </div>
        <div className="input-note"><kbd>RAY</kbd><span>选择</span><kbd>TRIGGER</kbd><span>轻触</span></div>
      </section>

      {ritual && <RitualOverlay id={ritual} onClose={() => setRitual(null)} onComplete={() => completeRitual(ritual)} />}

      <footer><span>{spatialMode ? 'PICO 空间模式' : '桌面预览'} · PORT 5190</span><p><i />选择物件后，用持续动作完成整理</p></footer>
    </main>
  )
}

const ritualCopy: Record<ActivityId, { title: string; instruction: string; mode: 'slide' | 'circle' | 'hold' | 'sweep'; material: string; cue: string; result: string }> = {
  shelf: { title: '让整排书脊齐平', instruction: '按住书挡，缓慢向右推，让每一本依次归位', mode: 'slide', material: '亚麻书脊 · 胡桃木', cue: '听一排纸页轻擦木格', result: '所有书都会同高、同向并贴齐底板' },
  repair: { title: '校准指针并重新上弦', instruction: '按住右侧上弦钥匙，缓缓转动三圈', mode: 'circle', material: '拉丝黄铜 · 珐琅表盘', cue: '听齿轮逐齿咬合', result: '时针、分针和秒针会重新协调运转' },
  water: { title: '把水送进花盆中央', instruction: '按住木柄，让细长壶嘴对准土壤再保持', mode: 'hold', material: '哑光铜壶 · 湿润土壤', cue: '听细水流准确落进泥土', result: '水会落在根部，枝叶随后自然舒展' },
  record: { title: '从唱片架取出并擦净黑胶', instruction: '先向右缓慢抽出一张唱片，再托住边缘，用绒布沿沟槽绕三圈', mode: 'circle', material: '纸套 · 黑胶 · 天鹅绒', cue: '先听纸套滑出，再听均匀的沟槽摩擦', result: '擦净的唱片会停在唱片机旁等待播放' },
  collection: { title: '把收藏品放回软垫', instruction: '托住陶瓷底部，缓缓移向暖光', mode: 'slide', material: '陶瓷 · 羊毛软垫', cue: '听底部轻触软垫', result: '光晕会在摆正时安静下来' },
  desk: { title: '把纸张边缘理齐', instruction: '按住纸面，来回做几次轻柔扫动', mode: 'sweep', material: '棉纸 · 木质桌面', cue: '听纸边一张张靠拢', result: '散开的纸角会慢慢重叠整齐' },
}

function RitualOverlay({ id, onClose, onComplete }: { id: ActivityId; onClose: () => void; onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const dragging = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const holdTimer = useRef(0)
  const done = useRef(false)
  const copy = ritualCopy[id]

  useEffect(() => () => window.clearInterval(holdTimer.current), [])

  const advance = (value: number) => {
    setProgress(current => {
      const next = Math.min(1, Math.max(current, value))
      if (next >= 1 && !done.current) {
        done.current = true
        window.setTimeout(onComplete, 520)
      }
      return next
    })
  }

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true
    last.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (copy.mode === 'hold') {
      window.clearInterval(holdTimer.current)
      holdTimer.current = window.setInterval(() => setProgress(current => {
        const next = Math.min(1, current + .018)
        if (next >= 1 && !done.current) { done.current = true; window.setTimeout(onComplete, 520) }
        return next
      }), 45)
    }
  }

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !last.current || done.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (id === 'record' && progress < .22) {
      const distance = Math.max(0, event.clientX - last.current.x)
      setProgress(current => Math.min(.22, current + distance / 420))
    } else if (copy.mode === 'slide') {
      advance((event.clientX - rect.left - 45) / (rect.width - 90))
    } else if (copy.mode === 'circle') {
      const centerX = rect.left + rect.width * (id === 'repair' ? .66 : id === 'record' ? .57 : .46)
      const centerY = rect.top + rect.height * .46
      const previousAngle = Math.atan2(last.current.y - centerY, last.current.x - centerX)
      const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX)
      let angleDelta = Math.abs(currentAngle - previousAngle)
      if (angleDelta > Math.PI) angleDelta = Math.PI * 2 - angleDelta
      const radius = Math.hypot(event.clientX - centerX, event.clientY - centerY)
      if (radius > 24 && radius < rect.width * .32) {
        setProgress(current => {
          const next = Math.min(1, current + angleDelta / (Math.PI * 6) * (id === 'record' ? .78 : 1))
          if (next >= 1 && !done.current) { done.current = true; window.setTimeout(onComplete, 520) }
          return next
        })
      }
    } else if (copy.mode === 'sweep') {
      const distance = Math.hypot(event.clientX - last.current.x, event.clientY - last.current.y)
      setProgress(current => {
        const next = Math.min(1, current + distance / 920)
        if (next >= 1 && !done.current) { done.current = true; window.setTimeout(onComplete, 520) }
        return next
      })
    }
    last.current = { x: event.clientX, y: event.clientY }
  }

  const pointerUp = () => {
    dragging.current = false
    last.current = null
    window.clearInterval(holdTimer.current)
  }

  const activity = activities.find(item => item.id === id)
  const percent = Math.round(progress * 100)
  const recordTake = id === 'record' ? Math.min(1, progress / .22) : 0
  const recordWipe = id === 'record' ? Math.max(0, (progress - .22) / .78) : 0
  const gestureLabel = id === 'record'
    ? progress < .22 ? '按住 · 向右抽出' : '托住 · 沿沟槽绕圈'
    : copy.mode === 'hold' ? '按住 · 保持'
      : copy.mode === 'circle' ? '按住 · 绕圈'
        : copy.mode === 'sweep' ? '按住 · 轻扫' : '按住 · 慢推'

  return (
    <div className="ritual-overlay" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className={`ritual-workbench ritual-${id} ${done.current ? 'done' : ''}`}>
        <header className="ritual-head">
          <div className="ritual-index"><span>{activity?.icon}</span><p><small>QUIET RITUAL · {activity?.number}</small><b>{activity?.title}</b></p></div>
          <button className="ritual-close" onClick={onClose} aria-label="暂时放下"><span>暂时放下</span><i>×</i></button>
        </header>

        <div className="ritual-body">
          <aside className="ritual-copy">
            <small>慢动作练习</small>
            <h2>{copy.title}</h2>
            <p>{copy.instruction}</p>
            <dl>
              <div><dt>触感</dt><dd>{copy.material}</dd></div>
              <div><dt>声音</dt><dd>{copy.cue}</dd></div>
              <div><dt>变化</dt><dd>{copy.result}</dd></div>
            </dl>
            <div className="ritual-breath"><i/><span>吸气</span><em/><span>呼气</span></div>
          </aside>

          <div className="gesture-panel">
            <div className="gesture-caption"><span>{gestureLabel}</span><b>{percent}<small>%</small></b></div>
            <div className="gesture-stage" style={{ '--progress': progress, '--record-take': recordTake, '--record-wipe': recordWipe } as CSSProperties} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} role="slider" tabIndex={0} aria-label={copy.instruction} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="gesture-scene">
                <i className="scene-surface"/><i className="scene-glow"/>
                {id === 'water' ? <WateringIllustration progress={progress}/> : <>
                  <i className="object-a"/><i className="object-b"/><i className="object-c"/>
                  <i className="object-d"/><i className="object-e"/><i className="object-f"/>
                  <i className="object-g"/><i className="object-h"/><i className="object-i"/>
                </>}
                <span className="gesture-hand"><i/>{progress > .03 ? '继续' : '按住'}</span>
              </div>
              <div className="gesture-track"><i /></div>
            </div>
            <div className="gesture-status"><i className={progress > 0 ? 'awake' : ''}/><b>{progress >= 1 ? '刚刚好，听它安静下来' : id === 'record' && progress < .22 ? '先感受纸套松开的轻微阻力' : copy.mode === 'hold' ? '保持住，不必加快' : '跟着物件的阻力慢慢移动'}</b><span>随时可以松手</span></div>
          </div>
        </div>

        <footer className="ritual-note"><i />没有倒计时，也没有做错。让手找到舒服的速度。</footer>
      </div>
    </div>
  )
}

function WateringIllustration({ progress }: { progress: number }) {
  const waterOpacity = Math.min(1, progress * 5)
  const tilt = progress * 4
  const leafLift = .94 + progress * .06

  return (
    <svg className="watering-illustration" viewBox="0 0 620 280" aria-hidden="true">
      <defs>
        <linearGradient id="canBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c29467"/><stop offset=".5" stopColor="#9a6d48"/><stop offset="1" stopColor="#65452f"/>
        </linearGradient>
        <linearGradient id="canSpout" x1="0" y1="0" x2="1" y2=".4">
          <stop offset="0" stopColor="#9c704b"/><stop offset=".62" stopColor="#bd8c5c"/><stop offset="1" stopColor="#765039"/>
        </linearGradient>
        <linearGradient id="potBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bd7758"/><stop offset=".55" stopColor="#955642"/><stop offset="1" stopColor="#623a34"/>
        </linearGradient>
        <linearGradient id="leafBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#92b28b"/><stop offset="1" stopColor="#4f7659"/>
        </linearGradient>
        <linearGradient id="waterLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d7eeea" stopOpacity=".75"/><stop offset=".55" stopColor="#a9d8d3"/><stop offset="1" stopColor="#dff1ed"/>
        </linearGradient>
      </defs>

      <ellipse cx="315" cy="236" rx="250" ry="28" fill="#a88155" opacity=".08"/>

      <g className="plant-drawing" style={{ transform: `scale(${leafLift})`, transformOrigin: '500px 170px' }}>
        <path d="M500 172 C500 145 498 118 503 91 C500 72 492 57 486 43" fill="none" stroke="#587d5d" strokeWidth="7" strokeLinecap="round"/>
        <path d="M500 139 C480 123 464 104 448 87 M501 116 C522 100 537 82 550 64 M500 104 C484 94 470 82 458 68" fill="none" stroke="#587d5d" strokeWidth="5" strokeLinecap="round"/>
        <path d="M448 89 C421 98 402 89 405 75 C410 59 434 54 458 79 C458 83 454 87 448 89Z" fill="url(#leafBody)"/>
        <path d="M550 66 C569 47 588 43 592 55 C595 69 576 88 550 91 C544 84 545 74 550 66Z" fill="url(#leafBody)"/>
        <path d="M486 45 C475 20 482 2 495 5 C508 10 508 31 493 52 C490 51 488 48 486 45Z" fill="url(#leafBody)"/>
        <path d="M460 70 C443 57 441 42 453 38 C466 34 479 48 480 67 C474 72 467 73 460 70Z" fill="url(#leafBody)"/>
        <path d="M519 101 C528 79 544 69 554 77 C563 87 551 105 526 113 C521 110 518 106 519 101Z" fill="url(#leafBody)"/>
      </g>

      <g className="pot-drawing">
        <path d="M445 169 C450 206 454 239 475 250 C491 259 520 258 536 248 C550 234 554 202 558 169Z" fill="url(#potBody)"/>
        <path d="M441 166 C441 156 562 156 562 166 C562 176 441 176 441 166Z" fill="#b86e50"/>
        <ellipse cx="501.5" cy="166" rx="51" ry="7" fill="#33291f"/>
        <path d="M458 184 C461 218 466 238 481 245" fill="none" stroke="#d6926e" strokeWidth="5" opacity=".18" strokeLinecap="round"/>
      </g>

      <g className="can-drawing" transform={`rotate(${tilt} 220 140)`}>
        <path d="M76 145 C76 115 96 97 131 95 L186 95 C216 96 235 112 235 143 L235 164 C235 190 211 207 172 210 L128 208 C93 205 73 184 76 145Z" fill="url(#canBody)"/>
        <path d="M105 101 C103 56 124 33 159 34 C194 35 214 58 211 102" fill="none" stroke="#8c6141" strokeWidth="15" strokeLinecap="round"/>
        <path d="M111 99 C111 67 128 50 158 50 C187 51 203 68 202 100" fill="none" stroke="#c18d5c" strokeWidth="5" opacity=".38" strokeLinecap="round"/>
        <path d="M214 119 C261 113 308 94 346 82 L358 94 C316 117 266 137 218 145Z" fill="url(#canSpout)"/>
        <path d="M346 81 L365 86 L358 96 L344 94Z" fill="#7e563a"/>
        <path d="M94 136 C105 112 128 104 155 104" fill="none" stroke="#e0b080" strokeWidth="6" opacity=".17" strokeLinecap="round"/>
      </g>

      <g className="water-drawing" style={{ opacity: waterOpacity }}>
        <path className="water-stream" d="M359 93 C402 95 446 108 476 135 C490 147 498 158 500 166" fill="none" stroke="url(#waterLine)" strokeWidth="3.4" strokeLinecap="round"/>
        <ellipse cx="405" cy="102" rx="2.2" ry="4.2" fill="#c7e5e1" opacity=".7" transform="rotate(-64 405 102)"/>
        <ellipse cx="454" cy="121" rx="2.3" ry="4.6" fill="#d8ece9" opacity=".78" transform="rotate(-48 454 121)"/>
        <ellipse cx="484" cy="145" rx="2.5" ry="5" fill="#c7e5e1" opacity=".82" transform="rotate(-31 484 145)"/>
        <path d="M500 158 C505 166 504 173 500 177 C495 173 494 166 500 158Z" fill="#c2e2de"/>
      </g>
    </svg>
  )
}
