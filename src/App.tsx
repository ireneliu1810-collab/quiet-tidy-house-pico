import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Spatial } from '@webspatial/core-sdk'
import { QuietRoom, type ActivityId, type RoomEvent } from './room'

const activities: Array<{ id: ActivityId; icon: string; title: string; hint: string }> = [
  { id: 'shelf', icon: '▥', title: '整理书架', hint: '让书脊慢慢对齐' },
  { id: 'repair', icon: '◷', title: '修复旧物', hint: '听一枚齿轮重新转动' },
  { id: 'water', icon: '♧', title: '给植物浇水', hint: '把水交给叶片与陶土' },
  { id: 'record', icon: '◎', title: '擦拭唱片', hint: '拂去细尘与微小底噪' },
  { id: 'collection', icon: '◇', title: '摆放收藏品', hint: '为喜欢的东西留一个位置' },
  { id: 'desk', icon: '▱', title: '收拾桌面', hint: '整理出一小片空白' },
]

const spatialStyle = (depth: number, material = 'thin') => ({
  '--xr-back': `${depth}`,
  '--xr-background-material': material,
}) as CSSProperties

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const roomRef = useRef<QuietRoom | null>(null)
  const [spatialMode, setSpatialMode] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [event, setEvent] = useState<RoomEvent>({ id: 'desk', label: '今晚没有必须完成的事', detail: '选一件顺手的小事，或只是待在这里听雨。' })
  const [recent, setRecent] = useState<ActivityId[]>([])

  useEffect(() => {
    try { setSpatialMode(new Spatial().runInSpatialWeb()) } catch { setSpatialMode(false) }
    if (!canvasRef.current) return
    const room = new QuietRoom(canvasRef.current, next => {
      setEvent(next)
      setRecent(items => [next.id, ...items.filter(item => item !== next.id)].slice(0, 3))
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
    const config = JSON.stringify({
      type: 'window',
      defaultSize: { width: '1600px', height: '1000px' },
      worldScaling: 'automatic',
      worldAlignment: 'adaptive',
    })
    const spatialUrl = `webspatial://createSpatialScene?url=${encodeURIComponent(target.toString())}&config=${encodeURIComponent(config)}`
    const timer = window.setTimeout(() => window.open(spatialUrl, '_blank'), 420)
    return () => window.clearTimeout(timer)
  }, [spatialMode])

  const trigger = (id: ActivityId) => {
    if (!soundOn) {
      const OriginalAudioContext = window.AudioContext
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: class extends OriginalAudioContext { createGain() { const gain = super.createGain(); gain.gain.value = 0; return gain } } })
      roomRef.current?.trigger(id)
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: OriginalAudioContext })
      return
    }
    roomRef.current?.trigger(id)
  }

  return (
    <main className="app">
      <div className="grain" />
      <header className="topbar soft-panel" enable-xr="true" style={spatialStyle(36)}>
        <div className="brand-mark"><span>静</span><i /></div>
        <div className="brand-copy"><small>QUIET TIDY HOUSE · PICO WEBSPATIAL</small><h1>静栖 <em>放松整理屋</em></h1></div>
        <div className="evening"><span><i />雨夜 · 22:18</span><b>{spatialMode ? '空间模式已就绪' : '桌面预览模式'}</b></div>
      </header>

      <section className="room-layout">
        <aside className="side-panel soft-panel" enable-xr="true" style={spatialStyle(74)}>
          <div className="section-label"><span>01</span><p><small>CHOOSE A GENTLE ACTION</small><b>随手做一点</b></p></div>
          <p className="intro">没有清单，也没有完成度。每次触碰只是让这间小屋更像今晚的你。</p>
          <div className="activity-list">
            {activities.map(item => (
              <button key={item.id} className={recent.includes(item.id) ? 'touched' : ''} onClick={() => trigger(item.id)}>
                <span>{item.icon}</span><p><b>{item.title}</b><small>{item.hint}</small></p><i>→</i>
              </button>
            ))}
          </div>
          <div className="permission-note"><i>∿</i><p><b>你可以随时停下</b><span>停留、看看窗外，或者离开，都算刚刚好。</span></p></div>
        </aside>

        <section className="scene-column">
          <div className="scene-meta"><span>RAIN ROOM / FREE PLAY</span><b><i />无计时 · 无失败 · 无关卡</b></div>
          <div className="scene-shell" enable-xr="true" style={spatialStyle(138, 'transparent')}>
            <canvas ref={canvasRef} aria-label="雨夜放松整理屋三维场景" />
            <div className="scene-vignette" />
            <div className="touch-guide"><span>轻轻触碰房间里的物品</span><i>书架 · 旧钟 · 植物 · 唱片 · 收藏品 · 纸张</i></div>
            <div className="breath"><i /><span>慢慢吸气</span><i /><span>慢慢呼气</span></div>
          </div>
          <div className="now-playing soft-panel" enable-xr="true" style={spatialStyle(104)}>
            <div className="sound-wave"><i /><i /><i /><i /><i /></div>
            <p><small>THE ROOM RESPONDS</small><b>{event.label}</b><span>{event.detail}</span></p>
            <button onClick={() => setSoundOn(value => !value)}><span>{soundOn ? '◖))' : '◖'}</span>{soundOn ? '环境声音开启' : '安静模式'}</button>
          </div>
        </section>

        <aside className="mood-panel soft-panel" enable-xr="true" style={spatialStyle(78)}>
          <div className="section-label"><span>02</span><p><small>ROOM ATMOSPHERE</small><b>今晚的质感</b></p></div>
          <div className="weather-orb"><div><i /><i /><i /><span>☾</span></div><p><small>窗外</small><b>细雨落在旧屋檐</b></p></div>
          <div className="texture-grid">
            <article><span className="wood" /><p><b>温润木纹</b><small>低沉 · 柔和</small></p></article>
            <article><span className="ceramic" /><p><b>粗陶表面</b><small>干燥 · 安静</small></p></article>
            <article><span className="paper" /><p><b>旧纸纤维</b><small>轻盈 · 沙沙</small></p></article>
          </div>
          <div className="ritual-card"><small>SLEEP RITUAL</small><b>睡前建议</b><p>只选两三件最顺手的物品。做完后，留一分钟给窗外的雨。</p><div><span /><span /><span /></div></div>
          <div className="input-hint"><kbd>RAY</kbd><span>手柄射线选择</span><kbd>TRIGGER</kbd><span>轻触物品</span></div>
        </aside>
      </section>

      <footer className="footer soft-panel" enable-xr="true" style={spatialStyle(48)}>
        <span>静栖不是一份待办清单。</span><b>PORT 5190 · PICO WEBSPATIAL · PROTOTYPE 0.1</b>
      </footer>
    </main>
  )
}
