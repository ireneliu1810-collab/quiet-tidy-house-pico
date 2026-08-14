import * as THREE from 'three'

export type ActivityId = 'shelf' | 'repair' | 'water' | 'record' | 'collection' | 'desk'

export type RoomEvent = {
  id: ActivityId
  label: string
  detail: string
}

type Interactive = {
  id: ActivityId
  mesh: THREE.Object3D
  rest: THREE.Vector3
  phase: number
}

const palette = {
  wall: 0x59685e, floor: 0x6d4c38, wood: 0x6e4932, paleWood: 0xb88e65,
  leaf: 0x4e7757, moss: 0x82906b, cream: 0xe6d6b9, brass: 0xaa8355,
  clay: 0xa66e55, ink: 0x222822, glow: 0xffdda5,
}

export class QuietRoom {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(44, 1, 0.1, 70)
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private clock = new THREE.Clock()
  private interactives: Interactive[] = []
  private hovered: Interactive | null = null
  private active: Interactive | null = null
  private activeStarted = 0
  private frame = 0
  private audio: AudioContext | null = null

  constructor(private canvas: HTMLCanvasElement, private onActivity: (event: RoomEvent) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.camera.position.set(0, 3.25, 9.6)
    this.camera.lookAt(0, 2.6, -3)
    this.buildRoom()
    this.resize()
    this.bind()
    this.animate()
  }

  trigger(id: ActivityId) {
    const item = this.interactives.find(entry => entry.id === id)
    if (item) this.activate(item)
  }

  private mat(color: number, roughness = .72, metalness = .05) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness })
  }

  private box(size: [number, number, number], color: number, position: [number, number, number], roughness = .72) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.mat(color, roughness))
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.scene.add(mesh)
    return mesh
  }

  private buildRoom() {
    this.scene.background = new THREE.Color(0x26342d)
    this.scene.fog = new THREE.FogExp2(0x26342d, .028)
    this.scene.add(new THREE.HemisphereLight(0xffefd2, 0x24342b, 2.2))
    const lamp = new THREE.PointLight(palette.glow, 80, 22, 2)
    lamp.position.set(-2.8, 5.2, 1.5)
    lamp.castShadow = true
    this.scene.add(lamp)
    const moon = new THREE.DirectionalLight(0xa9c5bd, 1.8)
    moon.position.set(5, 6, -5)
    this.scene.add(moon)

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 22), this.mat(palette.floor, .9))
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, -2)
    floor.receiveShadow = true
    this.scene.add(floor)
    this.box([18, 8, .25], palette.wall, [0, 4, -8])
    this.box([.25, 8, 22], 0x4a5c52, [-9, 4, -2])
    this.box([.25, 8, 22], 0x52655a, [9, 4, -2])

    // Window and rain-lit evening outside.
    this.box([4.5, 3.1, .14], 0x1c2a2a, [4.6, 4.7, -7.78], .25)
    for (const x of [2.45, 4.6, 6.75]) this.box([.07, 3.1, .12], palette.paleWood, [x, 4.7, -7.6])
    for (let i = 0; i < 34; i++) {
      const rain = new THREE.Mesh(new THREE.BoxGeometry(.018, .28 + Math.random() * .38, .01), new THREE.MeshBasicMaterial({ color: 0xb9d6d2, transparent: true, opacity: .38 }))
      rain.position.set(2.55 + Math.random() * 4.05, 3.25 + Math.random() * 2.9, -7.5)
      rain.userData.rain = true
      this.scene.add(rain)
    }

    // Bookshelf and softly misaligned books.
    this.box([4.2, .28, 1.2], palette.wood, [-5.6, 1.0, -6.2])
    this.box([4.2, .28, 1.2], palette.wood, [-5.6, 2.35, -6.2])
    this.box([4.2, .28, 1.2], palette.wood, [-5.6, 3.7, -6.2])
    this.box([.28, 4.3, 1.2], palette.wood, [-7.55, 2.55, -6.2])
    this.box([.28, 4.3, 1.2], palette.wood, [-3.65, 2.55, -6.2])
    const bookColors = [0x7d5545, 0x6e7f68, 0xb18a63, 0x536b70, 0x92684e]
    const bookGroup = new THREE.Group()
    for (let i = 0; i < 7; i++) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(.38 + i % 2 * .08, .92 + i % 3 * .12, .76), this.mat(bookColors[i % bookColors.length], .82))
      book.position.set(-1.35 + i * .45, .58 + (i % 3) * .03, 0)
      book.rotation.z = i === 5 ? -.19 : i === 2 ? .14 : 0
      book.castShadow = true
      bookGroup.add(book)
    }
    bookGroup.position.set(-5.7, 2.5, -5.5)
    this.scene.add(bookGroup)
    this.addInteractive('shelf', bookGroup)

    // Desk, record, repair object and scattered paper.
    this.box([7.6, .32, 3.2], palette.paleWood, [0, 1.45, -2.6], .8)
    for (const x of [-3.3, 3.3]) for (const z of [-3.7, -1.5]) this.box([.25, 1.5, .25], palette.wood, [x, .72, z])
    const record = new THREE.Mesh(new THREE.CylinderGeometry(.78, .78, .055, 64), this.mat(0x161919, .25, .2))
    record.rotation.x = Math.PI / 2
    record.position.set(2.25, 1.68, -2.8)
    record.castShadow = true
    const recordLabel = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .062, 32), this.mat(0xc28b63, .65))
    recordLabel.rotation.x = Math.PI / 2
    record.add(recordLabel)
    this.scene.add(record)
    this.addInteractive('record', record)

    const clock = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .17, 32), this.mat(palette.brass, .34, .65))
    body.rotation.x = Math.PI / 2
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .185, 32), this.mat(palette.cream, .85))
    face.rotation.x = Math.PI / 2
    clock.add(body, face)
    clock.position.set(-2.5, 1.77, -2.65)
    clock.rotation.z = -.12
    this.scene.add(clock)
    this.addInteractive('repair', clock)

    const papers = new THREE.Group()
    for (let i = 0; i < 4; i++) {
      const paper = new THREE.Mesh(new THREE.BoxGeometry(1.2, .025, .85), this.mat(i % 2 ? 0xd2c5aa : 0xe3d8bf, .95))
      paper.position.set((i - 1.5) * .2, i * .025, (i % 2) * .15)
      paper.rotation.y = (i - 1.5) * .14
      papers.add(paper)
    }
    papers.position.set(.1, 1.65, -2.15)
    this.scene.add(papers)
    this.addInteractive('desk', papers)

    // Plant with a warm clay pot.
    const plant = new THREE.Group()
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.58, .44, .88, 32), this.mat(palette.clay, .88))
    pot.position.y = .44
    plant.add(pot)
    for (let i = 0; i < 12; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), this.mat(i % 3 ? palette.leaf : palette.moss, .92))
      const angle = i * 2.4
      leaf.scale.set(.75, 2.3, .42)
      leaf.rotation.z = Math.sin(angle) * .65
      leaf.position.set(Math.sin(angle) * (.3 + i * .018), .95 + i * .11, Math.cos(angle) * .3)
      plant.add(leaf)
    }
    plant.position.set(5.7, .03, -5.7)
    this.scene.add(plant)
    this.addInteractive('water', plant)

    // Collection niche with tactile ceramic and wood objects.
    const collection = new THREE.Group()
    const shapes: THREE.BufferGeometry[] = [new THREE.SphereGeometry(.36, 24, 18), new THREE.ConeGeometry(.34, .72, 24), new THREE.DodecahedronGeometry(.38)]
    shapes.forEach((geometry, index) => {
      const object = new THREE.Mesh(geometry, this.mat([0xc28a6c, 0x78928b, 0xb89862][index], .65 - index * .1, index * .18))
      object.position.set((index - 1) * .9, .38, index === 1 ? -.08 : 0)
      object.castShadow = true
      collection.add(object)
    })
    collection.position.set(5.4, 1.5, -2.4)
    this.scene.add(collection)
    this.addInteractive('collection', collection)

    // Woven rug and hanging lamp complete the room scale.
    const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), this.mat(0x7b6550, .98))
    rug.rotation.x = -Math.PI / 2
    rug.scale.y = .65
    rug.position.set(0, .02, 1.3)
    this.scene.add(rug)
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1, 1.15, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xb18c65, roughness: .9, side: THREE.DoubleSide }))
    shade.position.set(-2.8, 5.55, 1.5)
    shade.rotation.x = Math.PI
    this.scene.add(shade)
  }

  private addInteractive(id: ActivityId, mesh: THREE.Object3D) {
    mesh.traverse(child => { child.userData.activity = id })
    this.interactives.push({ id, mesh, rest: mesh.position.clone(), phase: Math.random() * Math.PI * 2 })
  }

  private bind() {
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('resize', this.resize)
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.interactives.map(item => item.mesh), true)
    const id = hits[0]?.object.userData.activity as ActivityId | undefined
    const next = this.interactives.find(item => item.id === id) ?? null
    if (next !== this.hovered) {
      if (this.hovered) this.hovered.mesh.scale.setScalar(1)
      this.hovered = next
      if (next) next.mesh.scale.setScalar(1.035)
      this.canvas.style.cursor = next ? 'pointer' : 'default'
    }
  }

  private onPointerDown = () => { if (this.hovered) this.activate(this.hovered) }

  private activate(item: Interactive) {
    this.active = item
    this.activeStarted = performance.now()
    const copy: Record<ActivityId, RoomEvent> = {
      shelf: { id: 'shelf', label: '书脊轻轻归位', detail: '木格与纸页发出柔和的沙沙声。' },
      repair: { id: 'repair', label: '旧钟重新呼吸', detail: '小齿轮传来干净而克制的咔嗒声。' },
      water: { id: 'water', label: '叶片接住水珠', detail: '慢一点，听水落进陶土里的声音。' },
      record: { id: 'record', label: '唱片擦拭完成', detail: '细微底噪变得温暖、均匀。' },
      collection: { id: 'collection', label: '收藏品找到位置', detail: '陶瓷、木头与金属各自安静下来。' },
      desk: { id: 'desk', label: '桌面留出空白', detail: '纸张的边缘被轻轻理齐。' },
    }
    this.sound(item.id)
    navigator.vibrate?.(item.id === 'water' ? [18, 32, 14] : [20])
    this.onActivity(copy[item.id])
  }

  private sound(id: ActivityId) {
    this.audio ??= new AudioContext()
    if (this.audio.state === 'suspended') void this.audio.resume()
    const now = this.audio.currentTime
    const gain = this.audio.createGain()
    const filter = this.audio.createBiquadFilter()
    gain.gain.setValueAtTime(.0001, now)
    gain.gain.exponentialRampToValueAtTime(id === 'record' ? .055 : .035, now + .018)
    gain.gain.exponentialRampToValueAtTime(.0001, now + .55)
    filter.type = 'lowpass'
    filter.frequency.value = id === 'water' ? 1100 : id === 'repair' ? 2100 : 850
    gain.connect(filter).connect(this.audio.destination)
    const osc = this.audio.createOscillator()
    osc.type = id === 'record' ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime({ shelf: 160, repair: 440, water: 285, record: 96, collection: 220, desk: 145 }[id], now)
    osc.frequency.exponentialRampToValueAtTime(id === 'water' ? 150 : 92, now + .52)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + .58)
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()
    this.scene.traverse(object => {
      if (object.userData.rain) {
        object.position.y -= .013
        if (object.position.y < 3.2) object.position.y = 6.15
      }
    })
    this.interactives.forEach(item => {
      if (item !== this.active) item.mesh.position.y = item.rest.y + Math.sin(elapsed * .55 + item.phase) * .006
    })
    if (this.active) {
      const t = Math.min(1, (performance.now() - this.activeStarted) / 1100)
      const pulse = Math.sin(t * Math.PI)
      const mesh = this.active.mesh
      mesh.position.y = this.active.rest.y + pulse * .16
      mesh.rotation.y += .012 * pulse
      if (this.active.id === 'record') mesh.rotation.z += .04
      if (t >= 1) {
        mesh.position.copy(this.active.rest)
        mesh.scale.setScalar(this.hovered === this.active ? 1.035 : 1)
        this.active = null
      }
    }
    this.camera.position.x = Math.sin(elapsed * .08) * .08
    this.camera.lookAt(0, 2.55, -3)
    this.renderer.render(this.scene, this.camera)
  }

  private resize = () => {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (!width || !height) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  destroy() {
    cancelAnimationFrame(this.frame)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('resize', this.resize)
    this.renderer.dispose()
    void this.audio?.close()
  }
}
