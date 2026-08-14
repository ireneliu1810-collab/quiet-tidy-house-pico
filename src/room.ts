import * as THREE from 'three'
import { MusicSoundscape } from './soundscape'

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
  rotation: THREE.Euler
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
  private soundscape = new MusicSoundscape()

  constructor(private canvas: HTMLCanvasElement, private onRequest: (id: ActivityId) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.22
    this.camera.position.set(0, 3.35, 10.7)
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

  setAmbient(enabled: boolean) {
    return this.soundscape.setAmbient(enabled)
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
    this.scene.background = new THREE.Color(0x2a3b31)
    this.scene.fog = new THREE.FogExp2(0x26342d, .022)
    this.scene.add(new THREE.HemisphereLight(0xffefd2, 0x24342b, 2.8))
    const lamp = new THREE.PointLight(palette.glow, 112, 23, 2)
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

    // Deep blue window glass and layered diagonal rain establish an outside world.
    this.box([4.7, 3.25, .14], 0x213b40, [4.6, 4.7, -7.78], .3)
    const distantGlow = new THREE.Mesh(new THREE.CircleGeometry(.32, 24), new THREE.MeshBasicMaterial({ color: 0x829d92, transparent: true, opacity: .24 }))
    distantGlow.position.set(5.75, 5.38, -7.64)
    this.scene.add(distantGlow)
    for (const x of [2.28, 4.6, 6.92]) this.box([.09, 3.38, .13], palette.paleWood, [x, 4.7, -7.57])
    for (const y of [3.1, 6.3]) this.box([4.82, .09, .13], palette.paleWood, [4.6, y, -7.57])
    for (let i = 0; i < 72; i++) {
      const length = .18 + Math.random() * .52
      const rain = new THREE.Mesh(new THREE.BoxGeometry(.014, length, .012), new THREE.MeshBasicMaterial({ color: i % 5 ? 0xb9d8d2 : 0xe1eee6, transparent: true, opacity: .18 + Math.random() * .38 }))
      rain.position.set(2.35 + Math.random() * 4.5, 3.15 + Math.random() * 3.05, -7.47)
      rain.rotation.z = -.16
      rain.userData.rain = true
      rain.userData.speed = .012 + Math.random() * .018
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
    const recordMat = new THREE.MeshPhysicalMaterial({ color: 0x121616, roughness: .18, metalness: .12, clearcoat: .72, clearcoatRoughness: .2 })
    const record = new THREE.Mesh(new THREE.CylinderGeometry(.78, .78, .055, 64), recordMat)
    record.position.set(2.25, 1.655, -2.8)
    record.castShadow = true
    const recordLabel = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .062, 32), this.mat(0xc28b63, .65))
    recordLabel.position.y = .012
    record.add(recordLabel)
    this.scene.add(record)
    this.addInteractive('record', record)

    const clock = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .17, 32), this.mat(palette.brass, .34, .65))
    body.rotation.x = Math.PI / 2
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .185, 32), this.mat(palette.cream, .85))
    face.rotation.x = Math.PI / 2
    const handMat = this.mat(0x2b302c, .5, .3)
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(.055, .25, .025), handMat)
    hourHand.position.set(-.055, .055, .115)
    hourHand.rotation.z = .45
    const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(.045, .32, .025), handMat)
    minuteHand.position.set(.07, .08, .118)
    minuteHand.rotation.z = -1.0
    const centerPin = new THREE.Mesh(new THREE.SphereGeometry(.055, 16, 12), this.mat(palette.brass, .28, .72))
    centerPin.position.z = .145
    clock.add(body, face, hourHand, minuteHand, centerPin)
    for (const side of [-1, 1]) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(palette.brass, .28, .72))
      bell.position.set(side * .34, .43, 0)
      bell.rotation.z = side * -.35
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, .2, 12), this.mat(palette.brass, .32, .65))
      foot.position.set(side * .27, -.45, 0)
      foot.rotation.z = side * -.18
      clock.add(bell, foot)
    }
    const winder = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .15, 14), this.mat(0x544333, .45, .45))
    winder.position.set(.53, 0, 0)
    winder.rotation.z = Math.PI / 2
    clock.add(winder)
    clock.position.set(-2.5, 2.11, -2.65)
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

    // Plant with visible stems and paired leaves rather than a stack of blobs.
    const plant = new THREE.Group()
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.58, .44, .88, 32), this.mat(palette.clay, .88))
    pot.position.y = .44
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .035, 28), this.mat(0x3c2b20, .98))
    soil.position.y = .875
    plant.add(pot, soil)
    const leafMaterial = this.mat(palette.leaf, .78)
    const lightLeafMaterial = this.mat(palette.moss, .82)
    const stemMaterial = this.mat(0x476648, .85)
    for (let i = 0; i < 7; i++) {
      const angle = -.9 + i * .3
      const height = 1.0 + (i % 3) * .18
      const end = new THREE.Vector3(Math.sin(angle) * (.28 + i * .025), .88 + height, Math.cos(angle) * .24)
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .84, 0), new THREE.Vector3(end.x * .45, 1.25, end.z * .45), end])
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .025, 7, false), stemMaterial)
      plant.add(stem)
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 10), (i + side) % 2 ? leafMaterial : lightLeafMaterial)
        leaf.scale.set(1.25, .32, .58)
        leaf.position.set(end.x + side * .2, end.y - .08 + side * .1, end.z + side * .04)
        leaf.rotation.z = side * (.45 + i * .035)
        leaf.rotation.y = angle
        plant.add(leaf)
      }
    }
    plant.position.set(5.7, .03, -5.7)
    this.scene.add(plant)
    this.addInteractive('water', plant)

    // Collection niche with tactile ceramic and wood objects.
    this.box([2.9, .17, .82], palette.wood, [7.55, 2.36, -7.05], .82)
    const collection = new THREE.Group()
    const shapes: THREE.BufferGeometry[] = [new THREE.SphereGeometry(.36, 24, 18), new THREE.ConeGeometry(.34, .72, 24), new THREE.DodecahedronGeometry(.38)]
    shapes.forEach((geometry, index) => {
      const object = new THREE.Mesh(geometry, this.mat([0xc28a6c, 0x78928b, 0xb89862][index], .65 - index * .1, index * .18))
      object.position.set((index - 1) * .9, .38, index === 1 ? -.08 : 0)
      object.castShadow = true
      collection.add(object)
    })
    collection.scale.setScalar(.78)
    collection.position.set(7.55, 2.48, -6.62)
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
    this.interactives.push({ id, mesh, rest: mesh.position.clone(), rotation: mesh.rotation.clone() })
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

  private onPointerDown = () => { if (this.hovered) this.onRequest(this.hovered.id) }

  private activate(item: Interactive) {
    this.active = item
    this.activeStarted = performance.now()
    void this.soundscape.interaction(item.id)
    navigator.vibrate?.(item.id === 'water' ? [18, 32, 14] : [20])
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()
    this.scene.traverse(object => {
      if (object.userData.rain) {
        object.position.y -= object.userData.speed as number
        object.position.x -= (object.userData.speed as number) * .16
        if (object.position.y < 3.08) {
          object.position.y = 6.25
          object.position.x = 2.35 + Math.random() * 4.5
        }
      }
    })
    if (this.active) {
      const t = Math.min(1, (performance.now() - this.activeStarted) / 1100)
      const pulse = Math.sin(t * Math.PI)
      const mesh = this.active.mesh
      mesh.position.y = this.active.rest.y + pulse * .16
      if (this.active.id === 'record') mesh.rotation.y = this.active.rotation.y + t * Math.PI * 2
      else if (this.active.id === 'repair') mesh.rotation.z = this.active.rotation.z + Math.sin(t * Math.PI * 4) * .04
      else mesh.rotation.y = this.active.rotation.y + pulse * .08
      if (t >= 1) {
        mesh.position.copy(this.active.rest)
        mesh.rotation.copy(this.active.rotation)
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
    this.soundscape.destroy()
  }
}
