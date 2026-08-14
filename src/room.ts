import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { MusicSoundscape } from './soundscape'
import catAwakeUrl from './assets/cat-awake-v2.png'
import catSleepUrl from './assets/cat-sleep-v2.png'

export type ActivityId = 'shelf' | 'repair' | 'water' | 'record' | 'collection' | 'desk' | 'cat'

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

const colors = {
  wall: 0x53645a,
  wallDark: 0x394b43,
  wood: 0x744a33,
  woodLight: 0xa8704d,
  floorA: 0x7b5038,
  floorB: 0x68422f,
  cream: 0xe8dbc2,
  linen: 0x8f9887,
  moss: 0x55735a,
  leaf: 0x3f694c,
  brass: 0xb58a52,
  clay: 0xa6654f,
  ink: 0x17201c,
}

export class QuietRoom {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(28, 1, .1, 80)
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private clock = new THREE.Clock()
  private interactives: Interactive[] = []
  private hovered: Interactive | null = null
  private active: Interactive | null = null
  private activeStarted = 0
  private frame = 0
  private soundscape = new MusicSoundscape()
  private rain: THREE.Object3D[] = []
  private lampGlow: THREE.Mesh | null = null
  private catVisual: THREE.Group | null = null
  private catAwake: THREE.Mesh | null = null
  private catSleep: THREE.Mesh | null = null
  private catAwakeUntil = 0

  constructor(private canvas: HTMLCanvasElement, private onRequest: (id: ActivityId) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.camera.position.set(12.8, 10.2, 15.2)
    this.camera.lookAt(0, 2.15, -1.6)
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

  setPetting(enabled: boolean) {
    return this.soundscape.setPurring(enabled)
  }

  private material(color: number, roughness = .72, metalness = .04) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness })
  }

  private rounded(
    size: [number, number, number], color: number, position: [number, number, number],
    radius = .08, roughness = .72, metalness = .04, parent: THREE.Object3D = this.scene,
  ) {
    const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(radius, Math.min(...size) * .45))
    const mesh = new THREE.Mesh(geometry, this.material(color, roughness, metalness))
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  private box(
    size: [number, number, number], color: number, position: [number, number, number],
    roughness = .75, parent: THREE.Object3D = this.scene,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.material(color, roughness))
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  private buildRoom() {
    this.scene.background = new THREE.Color(0x070b09)
    this.scene.fog = new THREE.Fog(0x111b17, 24, 48)
    this.buildShell()
    this.buildLights()
    this.buildBookcase()
    this.buildDesk()
    this.buildWindow()
    this.buildLounge()
    this.buildDecor()
  }

  private buildShell() {
    // Cutaway room: the front and right walls are intentionally absent.
    const wallMaterial = this.material(colors.wall, .96)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(14.4, 7.4, .24), wallMaterial)
    backWall.position.set(0, 3.7, -7.0)
    backWall.receiveShadow = true
    this.scene.add(backWall)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(.24, 7.4, 12.4), this.material(colors.wallDark, .94))
    leftWall.position.set(-7.1, 3.7, -.9)
    leftWall.receiveShadow = true
    this.scene.add(leftWall)

    // Baseboards and wall panelling keep the room from reading as an empty box.
    this.rounded([14.2, .18, .2], 0x80624b, [0, .18, -6.82], .05, .82)
    this.rounded([.2, .18, 12.1], 0x6b503f, [-6.91, .18, -.9], .05, .84)
    for (let x = -6.3; x <= 6.3; x += 1.8) this.box([.025, 2.2, .04], 0x5f7167, [x, 1.3, -6.84], .94)

    // Long, staggered timber boards read as a warm residential floor instead of tiles.
    for (let row = 0; row < 20; row++) {
      for (let column = 0; column < 7; column++) {
        const stagger = row % 2 ? 1.02 : 0
        const x = -6.25 + column * 2.12 + stagger
        const z = -6.48 + row * .62
        this.rounded([2.02, .1, .56], (column + row) % 3 ? colors.floorA : colors.floorB, [x, .03, z], .022, .88)
      }
    }

    // Small ceiling edge makes the cutaway silhouette deliberate.
    this.rounded([14.4, .22, .36], 0x27372f, [0, 7.35, -6.86], .04, .9)
    this.rounded([.36, .22, 12.4], 0x23332b, [-6.94, 7.35, -.9], .04, .9)
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xbfd3ca, 0x34291f, 1.55))

    const moon = new THREE.DirectionalLight(0x86b9c4, 3.4)
    moon.position.set(7, 9, -3)
    moon.target.position.set(2.8, 1.7, -5.7)
    moon.castShadow = true
    moon.shadow.mapSize.set(1024, 1024)
    moon.shadow.camera.left = -10
    moon.shadow.camera.right = 10
    moon.shadow.camera.top = 10
    moon.shadow.camera.bottom = -10
    this.scene.add(moon, moon.target)

    const deskLight = new THREE.SpotLight(0xffb56c, 75, 12, .7, .75, 1.25)
    deskLight.position.set(-.2, 5.4, -4.5)
    deskLight.target.position.set(.2, 1.4, -4.6)
    deskLight.castShadow = true
    deskLight.shadow.mapSize.set(1024, 1024)
    this.scene.add(deskLight, deskLight.target)

    const floorLamp = new THREE.PointLight(0xffd49a, 34, 8, 2)
    floorLamp.position.set(5.45, 3.15, -1.85)
    this.scene.add(floorLamp)

    const windowFill = new THREE.PointLight(0x6ba4b9, 24, 13, 1.8)
    windowFill.position.set(4.5, 4.8, -5.8)
    this.scene.add(windowFill)
  }

  private buildBookcase() {
    const group = new THREE.Group()
    group.position.set(-5.25, 0, -5.88)
    this.scene.add(group)
    const wood = colors.wood
    this.rounded([3.05, .22, .78], wood, [0, .42, 0], .07, .76, .04, group)
    this.rounded([3.05, .22, .78], wood, [0, 2.0, 0], .07, .76, .04, group)
    this.rounded([3.05, .22, .78], wood, [0, 3.6, 0], .07, .76, .04, group)
    this.rounded([3.05, .22, .78], wood, [0, 5.18, 0], .07, .76, .04, group)
    this.rounded([.22, 5.0, .78], wood, [-1.42, 2.7, 0], .07, .76, .04, group)
    this.rounded([.22, 5.0, .78], wood, [1.42, 2.7, 0], .07, .76, .04, group)

    const bookColors = [0x7e5044, 0x657c6f, 0xb1865d, 0x455f67, 0x91654e, 0xc09a6d, 0x4e6d57]
    const interactiveBooks = new THREE.Group()
    for (let shelf = 0; shelf < 3; shelf++) {
      const count = shelf === 1 ? 7 : 9
      for (let i = 0; i < count; i++) {
        const width = .18 + (i % 3) * .045
        const height = .78 + ((i + shelf) % 4) * .12
        const book = this.rounded([width, height, .58], bookColors[(i + shelf * 2) % bookColors.length], [-1.08 + i * .27, .58 + shelf * 1.6 + height / 2, .08], .025, .82, .02, interactiveBooks)
        book.rotation.z = shelf === 1 && i === 5 ? -.13 : (i % 7 === 0 ? .035 : 0)
        const band = this.box([width + .012, .035, .59], 0xd6bd8d, [book.position.x, book.position.y + height * .25, .075], .62, interactiveBooks)
        band.rotation.z = book.rotation.z
      }
    }
    interactiveBooks.position.copy(group.position)
    this.scene.add(interactiveBooks)
    this.addInteractive('shelf', interactiveBooks)

    // Baskets and ceramics fill negative space like a lived-in room.
    this.rounded([1.1, .68, .6], 0x7f5b43, [-.68, .9, .06], .12, .9, .02, group)
    this.rounded([.9, .68, .6], 0x6b7769, [.62, .9, .06], .12, .9, .02, group)
    for (let i = 0; i < 4; i++) {
      const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(.16 + i * .025, 1), this.material([0xb67f67, 0x78928b, 0xd0a66b, 0x6e7b68][i], .7))
      pebble.position.set(-.42 + i * .28, 4.0, .05)
      pebble.castShadow = true
      group.add(pebble)
    }
  }

  private buildDesk() {
    const desk = new THREE.Group()
    desk.position.set(.55, 0, -5.2)
    this.scene.add(desk)
    this.rounded([6.4, .28, 1.85], colors.woodLight, [0, 1.72, 0], .11, .72, .03, desk)
    this.rounded([1.55, 1.45, 1.55], 0x8c5c42, [-2.18, .88, .02], .1, .78, .03, desk)
    this.rounded([1.55, 1.45, 1.55], 0x76503c, [2.18, .88, .02], .1, .8, .03, desk)
    for (const side of [-2.18, 2.18]) {
      for (let i = 0; i < 3; i++) {
        this.rounded([1.25, .34, .07], i % 2 ? 0x744b37 : 0x7d543e, [side, .48 + i * .44, 1.0], .045, .79, .03, desk)
        this.rounded([.38, .055, .08], colors.brass, [side, .48 + i * .44, 1.055], .026, .34, .7, desk)
      }
    }

    // Padded stool gives the desk an ergonomic, believable scale.
    this.rounded([1.35, .26, 1.12], 0x53645c, [.2, 1.05, 2.0], .18, .98, .02, desk)
    for (const x of [-.42, .82]) for (const z of [1.66, 2.34]) this.rounded([.1, 1.0, .1], 0x45372e, [x, .5, z], .035, .7, .3, desk)

    this.buildClock(desk)
    this.buildRecord(desk)
    this.buildPapers(desk)
    this.buildDeskLamp(desk)
    this.buildTeaSet(desk)
  }

  private buildClock(parent: THREE.Object3D) {
    const clockRoot = new THREE.Group()
    clockRoot.position.set(-1.0, 2.27, .18)
    parent.add(clockRoot)
    const clock = new THREE.Group()
    clock.scale.setScalar(.74)
    clockRoot.add(clock)
    const brass = this.material(colors.brass, .32, .68)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .19, 48), brass)
    body.rotation.x = Math.PI / 2
    body.castShadow = true
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .205, 48), this.material(colors.cream, .88))
    face.rotation.x = Math.PI / 2
    const hour = this.rounded([.045, .22, .025], colors.ink, [-.045, .05, .125], .018, .48, .25, clock)
    hour.rotation.z = .48
    const minute = this.rounded([.038, .29, .025], colors.ink, [.065, .08, .128], .018, .48, .25, clock)
    minute.rotation.z = -.95
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.05, 18, 12), brass)
    pin.position.z = .15
    clock.add(body, face, pin)
    for (let mark = 0; mark < 12; mark++) {
      const tick = this.rounded([.018, .075, .015], 0x6c5a43, [Math.sin(mark / 12 * Math.PI * 2) * .29, Math.cos(mark / 12 * Math.PI * 2) * .29, .122], .008, .5, .3, clock)
      tick.rotation.z = -mark / 12 * Math.PI * 2
    }
    for (const side of [-1, 1]) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(.19, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), brass)
      bell.position.set(side * .33, .41, 0)
      clock.add(bell)
      const foot = this.rounded([.08, .24, .1], colors.brass, [side * .27, -.43, 0], .025, .34, .65, clock)
      foot.rotation.z = side * -.18
    }
    this.addInteractive('repair', clockRoot)
  }

  private buildRecord(parent: THREE.Object3D) {
    const player = new THREE.Group()
    player.position.set(1.18, 1.89, .12)
    parent.add(player)
    this.rounded([1.56, .13, 1.22], 0x4c382d, [0, .075, 0], .11, .74, .08, player)
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .055, 64), this.material(0x343a36, .54, .18))
    platter.position.set(-.17, .17, .02)
    platter.castShadow = true
    player.add(platter)
    for (const radius of [.38, .47]) {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(radius, .006, 5, 64), this.material(0x626962, .42, .26))
      groove.rotation.x = Math.PI / 2
      groove.position.set(-.17, .2, .02)
      player.add(groove)
    }
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .1, 16), this.material(colors.brass, .28, .72))
    spindle.position.set(-.17, .24, .02)
    player.add(spindle)
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, .11, 24), this.material(0x88775f, .4, .56))
    pivot.position.set(.52, .2, -.38)
    player.add(pivot)
    const tonearm = this.rounded([.045, .045, .68], 0xb1a184, [.39, .27, -.11], .018, .36, .62, player)
    tonearm.rotation.y = -.42
    const cartridge = this.rounded([.13, .055, .18], 0x383c38, [.24, .25, .19], .025, .48, .28, player)
    cartridge.rotation.y = -.42
    const power = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .025, 18), this.material(0xc59b62, .32, .68))
    power.position.set(.57, .17, .4)
    player.add(power)

    // A floor rack keeps the records together instead of leaving one loose on the desk.
    const storage = new THREE.Group()
    storage.position.set(3.48, .04, -.04)
    parent.add(storage)
    this.rounded([1.04, .14, .82], 0x6c4936, [0, .09, 0], .055, .82, .04, storage)
    this.rounded([.13, .98, .82], 0x75513b, [-.46, .54, 0], .055, .8, .04, storage)
    this.rounded([.13, .98, .82], 0x75513b, [.46, .54, 0], .055, .8, .04, storage)
    this.rounded([1.04, .98, .1], 0x5b3d30, [0, .54, -.36], .04, .84, .03, storage)
    const sleeves = new THREE.Group()
    storage.add(sleeves)
    const sleeveColors = [0x9b6a52, 0x617a70, 0xc09b6d, 0x53656c, 0x8d7357, 0x6e8065, 0xaa765b, 0x7f6f62]
    for (let i = 0; i < sleeveColors.length; i++) {
      const x = -.31 + i * .087
      const sleeve = this.rounded([.065, .76, .67], sleeveColors[i], [x, .55 + (i % 2) * .012, .015], .018, .88, .01, sleeves)
      sleeve.rotation.z = (i - 3.5) * .008
      const label = this.rounded([.069, .17, .2], i % 2 ? 0xd1b984 : 0xb7c2ac, [x, .58, .355], .014, .82, .01, sleeves)
      label.rotation.z = sleeve.rotation.z
    }
    this.addInteractive('record', sleeves)
  }

  private buildPapers(parent: THREE.Object3D) {
    const papers = new THREE.Group()
    papers.position.set(.05, 1.9, .08)
    parent.add(papers)
    for (let i = 0; i < 5; i++) {
      const sheet = this.rounded([1.24, .018, .78], i % 2 ? 0xd4c8ad : 0xe8dec9, [(i - 2) * .045, i * .018, (i % 2) * .055], .018, .96, .01, papers)
      sheet.rotation.y = (i - 2) * .045
      for (let line = 0; line < 3; line++) this.box([.56 - line * .09, .004, .012], 0x8f9b91, [-.18, .014 + i * .018, -.18 + line * .12], .8, papers)
    }
    this.addInteractive('desk', papers)
  }

  private buildDeskLamp(parent: THREE.Object3D) {
    const lamp = new THREE.Group()
    lamp.position.set(-.18, 1.9, -.22)
    parent.add(lamp)
    const metal = this.material(0x4c554f, .42, .62)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, .075, 32), metal)
    base.castShadow = true
    lamp.add(base)

    const addArm = (start: THREE.Vector3, end: THREE.Vector3) => {
      const direction = end.clone().sub(start)
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, direction.length(), 18), metal)
      arm.position.copy(start).add(end).multiplyScalar(.5)
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
      arm.castShadow = true
      lamp.add(arm)
    }
    const baseJoint = new THREE.Vector3(.08, .07, 0)
    const elbowPoint = new THREE.Vector3(.16, .67, 0)
    const shadeJoint = new THREE.Vector3(-.31, 1.44, 0)
    addArm(baseJoint, elbowPoint)
    addArm(elbowPoint, shadeJoint)

    const elbow = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .035, 20), metal)
    elbow.position.copy(elbowPoint)
    elbow.rotation.x = Math.PI / 2
    elbow.castShadow = true
    lamp.add(elbow)

    const shadePivot = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .032, 20), metal)
    shadePivot.position.copy(shadeJoint)
    shadePivot.rotation.x = Math.PI / 2
    shadePivot.castShadow = true
    lamp.add(shadePivot)

    const powerButton = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .018, 18), this.material(colors.brass, .32, .68))
    powerButton.position.set(.17, .052, .1)
    lamp.add(powerButton)
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.14, .36, .34, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0x777c72, roughness: .48, metalness: .38, side: THREE.DoubleSide }))
    shade.position.set(-.39, 1.31, 0)
    shade.rotation.z = -.5
    shade.castShadow = true
    lamp.add(shade)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.355, .018, 8, 36), metal)
    rim.position.set(-.47, 1.17, 0)
    rim.rotation.set(Math.PI / 2, -.5, 0)
    lamp.add(rim)
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffcf8d }))
    glow.position.set(-.45, 1.18, 0)
    lamp.add(glow)
    this.lampGlow = glow
  }

  private buildTeaSet(parent: THREE.Object3D) {
    const tray = this.rounded([1.05, .045, .52], 0x503d2f, [2.42, 1.9, .18], .09, .8, .08, parent)
    tray.rotation.y = -.08
    const ceramic = this.material(0xb9ad94, .84)
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.23, .25, .025, 32), ceramic)
    saucer.position.set(2.2, 1.95, .18)
    parent.add(saucer)
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .24, 32, 1, true), ceramic)
    cup.position.set(2.2, 2.08, .18)
    cup.castShadow = true
    parent.add(cup)
    const cupRim = new THREE.Mesh(new THREE.TorusGeometry(.16, .018, 8, 32), ceramic)
    cupRim.position.set(2.2, 2.205, .18)
    cupRim.rotation.x = Math.PI / 2
    parent.add(cupRim)
    const tea = new THREE.Mesh(new THREE.CircleGeometry(.137, 32), new THREE.MeshStandardMaterial({ color: 0x4e291c, roughness: .34 }))
    tea.position.set(2.2, 2.197, .18)
    tea.rotation.x = -Math.PI / 2
    parent.add(tea)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.105, .025, 8, 28, Math.PI * 1.55), ceramic)
    handle.position.set(2.36, 2.09, .18)
    handle.rotation.z = -.78
    parent.add(handle)
    const tinMaterial = this.material(0x718379, .48, .24)
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .28, 24), tinMaterial)
    tin.position.set(2.68, 2.08, .16)
    tin.castShadow = true
    parent.add(tin)
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.145, .145, .045, 24), tinMaterial)
    lid.position.set(2.68, 2.24, .16)
    parent.add(lid)
    const label = new THREE.Mesh(new THREE.CylinderGeometry(.132, .132, .1, 24, 1, true), this.material(0xa99b76, .75))
    label.position.set(2.68, 2.07, .16)
    parent.add(label)
  }

  private buildWindow() {
    const window = new THREE.Group()
    window.position.set(4.65, 4.72, -6.78)
    this.scene.add(window)
    this.rounded([4.05, 3.15, .1], 0x152b32, [0, 0, -.06], .06, .22, .05, window)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.74, 2.86), new THREE.MeshPhysicalMaterial({ color: 0x27444a, roughness: .12, metalness: .05, transmission: .08, transparent: true, opacity: .58, depthWrite: false }))
    glass.position.z = .07
    glass.renderOrder = 2
    window.add(glass)
    for (const x of [-2.02, 0, 2.02]) this.rounded([.11, 3.28, .16], 0xa07958, [x, 0, .1], .035, .7, .04, window)
    for (const y of [-1.57, 1.57]) this.rounded([4.18, .11, .16], 0xa07958, [0, y, .1], .035, .7, .04, window)
    const moon = new THREE.Mesh(new THREE.CircleGeometry(.27, 30), new THREE.MeshBasicMaterial({ color: 0xb8cec4, transparent: true, opacity: .44 }))
    moon.position.set(1.05, .72, .005)
    moon.renderOrder = 0
    window.add(moon)
    for (let i = 0; i < 86; i++) {
      const length = .16 + Math.random() * .44
      const streak = new THREE.Mesh(new THREE.BoxGeometry(.012, length, .008), new THREE.MeshBasicMaterial({ color: i % 5 ? 0xa7ced0 : 0xe2efea, transparent: true, opacity: .28 + Math.random() * .44, depthWrite: false }))
      streak.position.set(-1.25 + Math.random() * 2.95, -1.08 + Math.random() * 2.16, .025)
      streak.rotation.z = -.2
      streak.renderOrder = 1
      streak.userData.rainSpeed = .012 + Math.random() * .022
      window.add(streak)
      this.rain.push(streak)
    }

    // The interior sill sits in front of the glass, making the rain read as outdoors.
    this.rounded([4.34, .16, .42], 0x8d664b, [0, -1.63, .25], .055, .76, .04, window)

    // Soft curtains frame the opening and add cloth volume.
    for (const side of [-1, 1]) {
      const curtain = new THREE.Group()
      for (let fold = 0; fold < 6; fold++) {
        const strip = this.rounded([.18, 3.4, .14], side < 0 ? 0x667c70 : 0x5c7167, [side * (2.22 + fold * .09 * -side), 0, .28 + Math.sin(fold) * .03], .08, .96, .01, curtain)
        strip.rotation.z = side * (.03 + fold * .008)
      }
      window.add(curtain)
    }
  }

  private buildLounge() {
    const chair = new THREE.Group()
    chair.position.set(2.8, 0, 1.7)
    chair.rotation.y = -.34
    this.scene.add(chair)
    const fabric = 0x59665f
    this.rounded([2.45, .56, 1.85], fabric, [0, .7, 0], .28, .98, .01, chair)
    const back = this.rounded([2.45, 1.55, .48], 0x536159, [0, 1.55, -.72], .27, .98, .01, chair)
    back.rotation.x = -.11
    this.rounded([.42, .8, 1.88], 0x4d5c54, [-1.1, 1.0, 0], .2, .98, .01, chair)
    this.rounded([.42, .8, 1.88], 0x4d5c54, [1.1, 1.0, 0], .2, .98, .01, chair)
    this.rounded([1.76, .24, 1.35], 0x718076, [0, 1.03, .05], .18, .99, .01, chair)
    const lumbar = this.rounded([1.38, .72, .3], 0x887862, [0, 1.62, -.37], .2, .99, .01, chair)
    lumbar.rotation.x = -.08
    for (const x of [-.36, .36]) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(.055, 16, 10), this.material(0x6e6253, .96))
      button.scale.z = .32
      button.position.set(x, 1.62, -.205)
      chair.add(button)
    }
    for (const x of [-.82, .82]) for (const z of [-.56, .56]) this.rounded([.12, .48, .12], 0x42352c, [x, .25, z], .035, .66, .24, chair)

    const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 80), this.material(0x756858, .99))
    rug.rotation.x = -Math.PI / 2
    rug.scale.y = .7
    rug.position.set(.7, .13, 1.0)
    rug.receiveShadow = true
    this.scene.add(rug)

    // Low table with a recognisable tea bowl and saucer.
    const table = new THREE.Group()
    table.position.set(-.25, 0, 1.2)
    this.scene.add(table)
    this.rounded([2.2, .23, 1.35], 0x9a6a4b, [0, .78, 0], .15, .78, .03, table)
    for (const x of [-.82, .82]) for (const z of [-.38, .38]) this.rounded([.14, .72, .14], 0x5b4132, [x, .36, z], .045, .72, .16, table)
    const coaster = new THREE.Mesh(new THREE.CylinderGeometry(.29, .31, .035, 36), this.material(0x554237, .82, .05))
    coaster.position.set(.25, .92, -.05)
    table.add(coaster)
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.24, .17, .19, 36, 1, true), this.material(0xa7aa98, .88))
    bowl.position.set(.25, 1.03, -.05)
    bowl.castShadow = true
    table.add(bowl)
    const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(.24, .018, 8, 36), this.material(0xc1c0aa, .86))
    bowlRim.position.set(.25, 1.13, -.05)
    bowlRim.rotation.x = Math.PI / 2
    table.add(bowlRim)
    const tea = new THREE.Mesh(new THREE.CircleGeometry(.21, 36), new THREE.MeshStandardMaterial({ color: 0x4a2d20, roughness: .32 }))
    tea.position.set(.25, 1.122, -.05)
    tea.rotation.x = -Math.PI / 2
    table.add(tea)

    this.buildBeanbag()
    this.buildCat()
  }

  private buildBeanbag() {
    const beanbag = new THREE.Group()
    beanbag.position.set(-5.35, .08, -1.45)
    beanbag.rotation.y = .12
    beanbag.scale.setScalar(1.08)
    this.scene.add(beanbag)

    const fabric = new THREE.MeshStandardMaterial({ color: 0x7f7b61, roughness: .99, metalness: .01, side: THREE.DoubleSide })
    const fabricDark = this.material(0x56594c, .99, .01)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.32, 72),
      new THREE.MeshBasicMaterial({ color: 0x18201c, transparent: true, opacity: .24, depthWrite: false }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.scale.y = .82
    shadow.position.y = .04
    beanbag.add(shadow)

    const shellProfile = [
      new THREE.Vector2(.92, 0), new THREE.Vector2(1.08, .08), new THREE.Vector2(1.18, .31),
      new THREE.Vector2(1.2, .65), new THREE.Vector2(1.16, .94), new THREE.Vector2(1.05, 1.15),
      new THREE.Vector2(.86, 1.24), new THREE.Vector2(.7, 1.14), new THREE.Vector2(.64, .94),
      new THREE.Vector2(.7, .74), new THREE.Vector2(.78, .62),
    ]
    const shell = new THREE.Mesh(new THREE.LatheGeometry(shellProfile, 96), fabric)
    shell.scale.set(1.12, 1, .96)
    shell.castShadow = true
    shell.receiveShadow = true
    beanbag.add(shell)

    const rim = new THREE.Mesh(new THREE.TorusGeometry(.86, .2, 24, 96), fabric)
    rim.rotation.x = Math.PI / 2
    rim.scale.set(1.12, .96, 1)
    rim.position.y = .9
    rim.castShadow = true
    beanbag.add(rim)

    // A buried U-shaped bolster keeps a soft continuous outline without the
    // exposed flat ends or the round-ball silhouette of the previous versions.
    const backCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.7, .64, -.52),
      new THREE.Vector3(-.64, 1.25, -.55),
      new THREE.Vector3(0, 1.57, -.58),
      new THREE.Vector3(.64, 1.25, -.55),
      new THREE.Vector3(.7, .64, -.52),
    ])
    const backBolster = new THREE.Mesh(new THREE.TubeGeometry(backCurve, 56, .28, 20, false), fabric)
    backBolster.castShadow = true
    beanbag.add(backBolster)

    const innerBack = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 28), fabricDark)
    innerBack.position.set(0, 1.02, -.5)
    innerBack.scale.set(.72, .54, .12)
    innerBack.receiveShadow = true
    beanbag.add(innerBack)

    const seat = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 28), fabricDark)
    seat.scale.set(.73, .15, .68)
    seat.position.set(0, .66, .04)
    seat.receiveShadow = true
    beanbag.add(seat)

    const foldMaterial = new THREE.MeshStandardMaterial({ color: 0x45483d, roughness: 1, transparent: true, opacity: .3 })
    for (let index = 0; index < 30; index++) {
      const angle = index / 30 * Math.PI * 2
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
      const fold = new THREE.CatmullRomCurve3([
        direction.clone().multiply(new THREE.Vector3(.76, 0, .69)).setY(1.18),
        direction.clone().multiply(new THREE.Vector3(1.03, 0, .9)).setY(1.02),
        direction.clone().multiply(new THREE.Vector3(1.13, 0, .98)).setY(.7),
      ])
      const seam = new THREE.Mesh(new THREE.TubeGeometry(fold, 12, .008, 5, false), foldMaterial)
      beanbag.add(seam)
    }

    const pillow = new THREE.Mesh(new RoundedBoxGeometry(.9, .68, .22, 5, .17), this.material(0x74756f, .98, .01))
    pillow.position.set(.03, 1.4, .42)
    pillow.rotation.set(-.22, .04, .06)
    pillow.castShadow = true
    beanbag.add(pillow)

  }

  private buildCat() {
    const cat = new THREE.Group()
    cat.position.set(2.8, 1.13, 1.58)
    cat.rotation.y = .63
    this.scene.add(cat)

    const visual = new THREE.Group()
    cat.add(visual)
    this.catVisual = visual

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(.62, 48),
      new THREE.MeshBasicMaterial({ color: 0x17201c, transparent: true, opacity: .27, depthWrite: false }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.scale.y = .42
    shadow.position.set(.02, .025, .02)
    visual.add(shadow)

    const textureLoader = new THREE.TextureLoader()
    const makeCharacter = (url: string) => {
      const texture = textureLoader.load(url)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      const character = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.7),
        new THREE.MeshBasicMaterial({
          map: texture,
          // The source render is studio-bright; this warm multiplier seats it in the room's night lighting.
          color: 0xb6aa98,
          transparent: true,
          alphaTest: .025,
          depthWrite: true,
          side: THREE.DoubleSide,
          toneMapped: true,
        }),
      )
      character.position.set(0, .84, .035)
      character.renderOrder = 3
      visual.add(character)
      return character
    }

    this.catSleep = makeCharacter(catSleepUrl)
    this.catAwake = makeCharacter(catAwakeUrl)
    this.catAwake.visible = false

    this.addInteractive('cat', cat)
  }

  private buildDecor() {
    this.buildPlant()
    this.buildCollection()

    // Floor lamp: stem, weighted base and a broad linen drum shade.
    const lamp = new THREE.Group()
    lamp.position.set(5.7, 0, -1.9)
    this.scene.add(lamp)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, .12, 36), this.material(0x5a5044, .45, .48))
    base.position.y = .12
    base.castShadow = true
    lamp.add(base)
    this.rounded([.09, 3.55, .09], 0x655a4d, [0, 1.9, 0], .035, .42, .56, lamp)
    const shadeMaterial = new THREE.MeshStandardMaterial({ color: 0xc1aa82, roughness: .96, transparent: true, opacity: .96, side: THREE.DoubleSide })
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.36, .58, .62, 40, 1, true), shadeMaterial)
    shade.position.y = 3.72
    shade.castShadow = true
    lamp.add(shade)
    for (const [radius, y] of [[.36, 4.03], [.58, 3.41]] as const) {
      const trim = new THREE.Mesh(new THREE.TorusGeometry(radius, .018, 8, 40), this.material(0x8f7557, .78))
      trim.position.y = y
      trim.rotation.x = Math.PI / 2
      lamp.add(trim)
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd8a0 }))
    bulb.position.y = 3.56
    lamp.add(bulb)

    // Framed botanical prints on the left wall.
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Group()
      frame.position.set(-6.92, 3.4 + i * .92, -1.5 + i * .7)
      frame.rotation.y = Math.PI / 2
      this.scene.add(frame)
      this.rounded([1.05, .72, .08], 0x3d342d, [0, 0, 0], .045, .6, .1, frame)
      this.rounded([.88, .56, .085], 0xd1c6ad, [0, 0, .03], .025, .92, .01, frame)
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), this.material(i % 2 ? 0x6c806c : 0x8b7960, .9))
      leaf.scale.set(2.1, .45, .12)
      leaf.position.z = .09
      leaf.rotation.z = -.45 + i * .28
      frame.add(leaf)
    }
  }

  private buildPlant() {
    const plant = new THREE.Group()
    plant.position.set(5.05, 0, -4.85)
    this.scene.add(plant)
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.53, .43, .86, 36), this.material(colors.clay, .9))
    pot.position.y = .48
    pot.castShadow = true
    plant.add(pot)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.5, .055, 10, 36), this.material(0x844c3b, .82))
    rim.rotation.x = Math.PI / 2
    rim.position.y = .87
    plant.add(rim)
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .04, 30), this.material(0x39281e, .99))
    soil.position.y = .88
    plant.add(soil)
    const stemMaterial = this.material(0x3d6044, .88)
    const leafMaterials = [this.material(colors.leaf, .78), this.material(colors.moss, .82), this.material(0x718565, .84)]
    for (let i = 0; i < 9; i++) {
      const angle = -1.2 + i * .3
      const height = 1.15 + (i % 4) * .2
      const end = new THREE.Vector3(Math.sin(angle) * (.32 + i * .018), .84 + height, Math.cos(angle) * .3)
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .83, 0), new THREE.Vector3(end.x * .45, 1.32, end.z * .45), end])
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .023, 7, false), stemMaterial)
      stem.castShadow = true
      plant.add(stem)
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 10), leafMaterials[(i + (side > 0 ? 1 : 0)) % leafMaterials.length])
        leaf.scale.set(1.45, .28, .62)
        leaf.position.set(end.x + side * .23, end.y - .08 + side * .11, end.z + side * .06)
        leaf.rotation.z = side * (.5 + i * .018)
        leaf.rotation.y = angle
        leaf.castShadow = true
        plant.add(leaf)
      }
    }
    this.addInteractive('water', plant)
  }

  private buildCollection() {
    const collection = new THREE.Group()
    collection.position.set(5.15, 3.0, -6.48)
    this.scene.add(collection)
    this.rounded([2.5, .16, .65], colors.wood, [0, -.32, 0], .06, .76, .04, collection)
    const vase = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(.25, .04), new THREE.Vector2(.28, .34), new THREE.Vector2(.16, .55), new THREE.Vector2(.13, .72), new THREE.Vector2(.19, .76),
    ], 32), this.material(0xb77d63, .7))
    vase.position.set(-.72, -.22, 0)
    vase.castShadow = true
    collection.add(vase)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.24, .62, 28), this.material(0x71897f, .68, .14))
    cone.position.set(0, .02, 0)
    cone.castShadow = true
    collection.add(cone)
    const carved = new THREE.Mesh(new THREE.DodecahedronGeometry(.3, 2), this.material(0xb8915f, .55, .24))
    carved.position.set(.72, .02, 0)
    carved.castShadow = true
    collection.add(carved)
    this.addInteractive('collection', collection)
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
      if (this.hovered && this.hovered !== this.active) this.hovered.mesh.scale.setScalar(1)
      this.hovered = next
      if (next && next !== this.active) next.mesh.scale.setScalar(1.025)
      this.canvas.style.cursor = next ? 'pointer' : 'default'
    }
  }

  private onPointerDown = () => { if (this.hovered) this.onRequest(this.hovered.id) }

  private activate(item: Interactive) {
    this.active = item
    this.activeStarted = performance.now()
    if (item.id === 'cat') this.catAwakeUntil = performance.now() + 6500
    void this.soundscape.interaction(item.id)
    navigator.vibrate?.(item.id === 'water' ? [18, 32, 14] : [20])
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()
    this.rain.forEach(streak => {
      streak.position.y -= streak.userData.rainSpeed as number
      streak.position.x -= (streak.userData.rainSpeed as number) * .19
      if (streak.position.y < -1.4) {
        streak.position.y = 1.18
        streak.position.x = -1.25 + Math.random() * 2.95
      }
    })
    if (this.lampGlow) this.lampGlow.scale.setScalar(.98 + Math.sin(elapsed * 1.9) * .025)
    if (this.catVisual) {
      const breathing = 1 + Math.sin(elapsed * 1.45) * .018
      this.catVisual.scale.set(1, breathing, 1)
    }
    const catAwake = performance.now() < this.catAwakeUntil
    if (this.catAwake) this.catAwake.visible = catAwake
    if (this.catSleep) this.catSleep.visible = !catAwake
    if (this.active) {
      const t = Math.min(1, (performance.now() - this.activeStarted) / 1150)
      const pulse = Math.sin(t * Math.PI)
      const mesh = this.active.mesh
      mesh.position.y = this.active.rest.y + pulse * (this.active.id === 'cat' ? .025 : .1)
      if (this.active.id === 'cat') mesh.rotation.y = this.active.rotation.y + Math.sin(t * Math.PI * 3) * .018
      else if (this.active.id === 'record') mesh.rotation.y = this.active.rotation.y + t * Math.PI * 2
      else if (this.active.id === 'repair') mesh.rotation.z = this.active.rotation.z + Math.sin(t * Math.PI * 4) * .035
      else mesh.rotation.y = this.active.rotation.y + pulse * .055
      if (t >= 1) {
        mesh.position.copy(this.active.rest)
        mesh.rotation.copy(this.active.rotation)
        mesh.scale.setScalar(this.hovered === this.active ? 1.025 : 1)
        this.active = null
      }
    }
    // Imperceptible breathing in the camera keeps the room alive without moving objects.
    this.camera.position.y = 10.2 + Math.sin(elapsed * .22) * .025
    this.camera.lookAt(0, 2.15, -1.6)
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
