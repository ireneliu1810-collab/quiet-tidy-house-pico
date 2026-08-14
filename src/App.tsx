import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Spatial } from '@webspatial/core-sdk'
import { QuietRoom, type ActivityId, type RoomEvent } from './room'

const activities: Array<{ id: ActivityId; icon: string; title: string; hint: string; number: string }> = [
  { id: 'shelf', icon: '▥', title: '整理书架', hint: '纸页与木格', number: '01' },
  { id: 'repair', icon: '◷', title: '修复旧钟', hint: '齿轮与黄铜', number: '02' },
  { id: 'water', icon: '♧', title: '给植物浇水', hint: '水珠与陶土', number: '03' },
  { id: 'record', icon: '◎', title: '擦拭唱片', hint: '绒布与黑胶', number: '04' },
  { id: 'collection', icon: '◇', title: '摆放收藏', hint: '陶瓷与木头', number: '05' },
  { id: 'desk', icon: '▱', title: '收拾桌面', hint: '旧纸与留白', number: '06' },
]

const events: Record<ActivityId, RoomEvent> = {
  shelf: { id: 'shelf', label: '书脊轻轻归位', detail: '木格与纸页发出柔和的沙沙声。' },
  repair: { id: 'repair', label: '旧钟重新呼吸', detail: '小齿轮传来干净而克制的咔嗒声。' },
  water: { id: 'water', label: '叶片接住水珠', detail: '水落进陶土，叶片慢慢舒展开来。' },
  record: { id: 'record', label: '唱片擦拭完成', detail: '绒布划过一整圈，细小灰尘离开沟槽。' },
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

const ritualCopy: Record<ActivityId, { title: string; instruction: string; mode: 'slide' | 'circle' | 'hold' | 'sweep' }> = {
  shelf: { title: '把书送回空位', instruction: '按住书脊，缓缓向右拖入书架', mode: 'slide' },
  repair: { title: '为旧钟重新上弦', instruction: '按住旋钮，稳定地画几个圆圈', mode: 'circle' },
  water: { title: '让水慢慢渗进陶土', instruction: '按住壶柄，不急着松开', mode: 'hold' },
  record: { title: '沿着沟槽擦拭唱片', instruction: '按住绒布，绕着唱片缓缓画圈', mode: 'circle' },
  collection: { title: '把收藏品放回软垫', instruction: '按住物件，缓缓拖到右侧光晕', mode: 'slide' },
  desk: { title: '把纸张边缘理齐', instruction: '按住纸面，来回做几次轻柔扫动', mode: 'sweep' },
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
    if (copy.mode === 'slide') {
      advance((event.clientX - rect.left - 45) / (rect.width - 90))
    } else {
      const distance = Math.hypot(event.clientX - last.current.x, event.clientY - last.current.y)
      setProgress(current => {
        const targetDistance = copy.mode === 'circle' ? 780 : copy.mode === 'hold' ? 720 : 920
        const next = Math.min(1, current + distance / targetDistance)
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

  return (
    <div className="ritual-overlay" role="dialog" aria-modal="true" aria-label={copy.title}>
      <button className="ritual-close" onClick={onClose} aria-label="暂时放下">×</button>
      <div className="ritual-copy"><small>SLOW GESTURE · {activities.find(item => item.id === id)?.number}</small><h2>{copy.title}</h2><p>{copy.instruction}</p></div>
      <div className={`gesture-stage ritual-${id} ${done.current ? 'done' : ''}`} style={{ '--progress': progress } as CSSProperties} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} role="button" tabIndex={0} aria-label={copy.instruction}>
        <div className="gesture-scene"><i className="object-a"/><i className="object-b"/><i className="object-c"/><span className="gesture-hand">✦</span></div>
        <div className="gesture-track"><i /></div>
        <b>{progress >= 1 ? '刚刚好' : copy.mode === 'hold' ? '保持住，听水慢慢落下' : '不用快，沿着动作继续'}</b>
      </div>
      <div className="ritual-note"><i />没有倒计时。手臂累了，就先松开。</div>
    </div>
  )
}
