import { useEffect, useRef, useState, type CSSProperties } from 'react'
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

  useEffect(() => {
    try { setSpatialMode(new Spatial().runInSpatialWeb()) } catch { setSpatialMode(false) }
    if (!canvasRef.current) return
    const room = new QuietRoom(canvasRef.current, next => {
      setEvent(next)
      setActive(next.id)
      window.setTimeout(() => setActive(current => current === next.id ? null : current), 1700)
    })
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
        <button className={`music-control ${musicOn ? 'playing' : ''}`} onClick={toggleMusic}>
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
            <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => roomRef.current?.trigger(item.id)}>
              <small>{item.number}</small><span>{item.icon}</span><p><b>{item.title}</b><em>{item.hint}</em></p>
            </button>
          ))}
        </div>
        <div className="input-note"><kbd>RAY</kbd><span>选择</span><kbd>TRIGGER</kbd><span>轻触</span></div>
      </section>

      <footer><span>{spatialMode ? 'PICO 空间模式' : '桌面预览'} · PORT 5190</span><p><i />环境声音会在你主动播放后开始</p></footer>
    </main>
  )
}
