// Hlavní třída: renderer, scéna, kamera, relace (svět + balon), automat herních stavů.
import * as THREE from 'three';
import { WORLD, CAMERA, TIME_OF_DAY, CLOUD_LAYER } from '../config/GameConfig.js';
import { ProceduralTerrain } from '../world/ProceduralTerrain.js';
import { getSite, createBiomes } from '../world/Sites.js';
import { loadTitles } from './Titles.js';
import { WindModel } from './WindModel.js';
import { StateMachine } from './StateMachine.js';
import { FlightPlan } from './FlightPlan.js';
import { Balloon } from '../entities/Balloon.js';
import { createTargetMarker } from '../entities/GroundProps.js';
import { designCanvas, loadFleet } from '../entities/EnvelopeDesigns.js';
import { Sky } from '../world/Sky.js';
import { installHeightFog, setHeightFog } from '../world/HeightFog.js';
import { HUD } from '../ui/HUD.js';
import { TouchControls } from '../ui/TouchControls.js';
import { SynthAudio } from '../audio/SynthAudio.js';
import { Birds } from '../world/Birds.js';
import { MusicPlayer } from '../audio/MusicPlayer.js';
import { SettingsMenu } from '../ui/SettingsMenu.js';
import { PlanPhase } from '../phases/PlanPhase.js';
import { LaunchPhase } from '../phases/LaunchPhase.js';
import { FlightPhase } from '../phases/FlightPhase.js';
import { LandingPhase } from '../phases/LandingPhase.js';
import { CelebrationPhase } from '../phases/CelebrationPhase.js';

const FIXED_DT = 1 / 60;

function disposeTree(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (Array.isArray(m)) m.forEach((x) => { x.map?.dispose?.(); x.dispose?.(); });
    else if (m) { m.map?.dispose?.(); m.dispose?.(); }
  });
}

// Kde je tlačítko nastavení v jednotlivých herních fázích
const SETTINGS_MODE = { PLAN: 'plan', LAUNCH: 'standalone', FLIGHT: 'hud', LANDING: 'hud', CELEBRATION: 'standalone' };

export class GameApp {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.params = new URLSearchParams(location.search);

    installHeightFog();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, 8000);

    this.rig = { target: new THREE.Vector3(), yaw: 0, pitch: 0.28, dist: CAMERA.distance, cockpit: null };
    this.user = { yaw: 0, pitch: 0, dist: 0 };
    this.camSnap = true;
    this.acc = 0;
    this.last = 0;

    this.audio = new SynthAudio();
    this.music = new MusicPlayer(this.audio);
    // zvuk i hudba se smí spustit až po první interakci (autoplay politika prohlížečů)
    const firstInput = () => { this.audio.unlock(); this.music.start(); };
    window.addEventListener('pointerdown', firstInput, { once: true, capture: true });
    window.addEventListener('keydown', firstInput, { once: true, capture: true });
    this.fleet = [];                                   // balony z public/envelopes
    this.fleetReady = loadFleet(import.meta.env.BASE_URL).then((f) => { this.fleet = f; return f; });
    this.titles = {};                                  // tituly z public/titles.json
    this.titlesReady = loadTitles(import.meta.env.BASE_URL).then((d) => { this.titles = d; return d; });
    this.plan = new FlightPlan({ name: '' });
    this.world = null;
    this.balloon = null;
    this.props = new THREE.Group();
    this.scene.add(this.props);

    this.setupLights();
    this.sky = new Sky();
    this.scene.add(this.sky.getMesh());
    this.controls = new TouchControls(uiRoot);
    this.setupSettings();
    this.setupPointer();

    this.sm = new StateMachine();
    this.sm.register('PLAN', new PlanPhase(this));
    this.sm.register('LAUNCH', new LaunchPhase(this));
    this.sm.register('FLIGHT', new FlightPhase(this));
    this.sm.register('LANDING', new LandingPhase(this));
    this.sm.register('CELEBRATION', new CelebrationPhase(this));

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---------- Inicializace ----------
  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xdff1ff, 0x6b7a4a, 1.05);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
    this.sun.position.set(-0.5, 0.8, 0.4);
    this.scene.add(this.hemi, this.sun);
  }

  /** Znovu postaví HUD a ovládání (po změně jazyka). */
  rebuildUi() {
    this.hud.destroy();
    this.controls.destroy();
    this.settings.destroy();
    this.controls = new TouchControls(this.uiRoot);
    this.setupSettings();
    this.hud.setVisible(false);
    this.controls.setVisible(false);
  }

  setupSettings() {
    this.settings = new SettingsMenu(this.uiRoot, this.audio, this.music, () => this.go('PLAN'), (open) => { this.paused = open; });
    this.hud = new HUD(this.uiRoot, (anchor) => this.settings.toggle(anchor), (anchor) => this.settings.togglePromo(anchor), () => this.go('PLAN'), () => this.settings.openWiki());
  }

  setupPointer() {
    const c = this.canvas;
    let drag = null;
    const touches = new Map();   // aktivní dotyky pro pinch
    let pinch = 0;
    c.addEventListener('pointerdown', (e) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
      else drag = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.zoomBy((pinch - d) * CAMERA.pinchSpeed);
        pinch = d;
        return;
      }
      if (!drag) return;
      this.user.yaw -= (e.clientX - drag.x) * 0.005;
      // z koše lze s přehledem otočit hlavou téměř svisle nahoru (plameny) i dolů; zvenku je rozsah menší
      const [lo, hi] = this.rig.cockpit ? [-1.35, 1.5] : [-0.3, 0.9];
      this.user.pitch = Math.min(hi, Math.max(lo, this.user.pitch + (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = (e) => { touches.delete(e.pointerId); pinch = 0; drag = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => {
      this.zoomBy(e.deltaY * 0.05);
    }, { passive: true });
  }

  /** Změní vzdálenost kamery (kladné = oddálit); společné pro kolečko, stisk dvěma prsty a tlačítka +/−. */
  zoomBy(d) {
    this.user.dist = Math.min(CAMERA.maxDistance, Math.max(-CAMERA.distance * 0.6, this.user.dist + d));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- Svět a balon ----------
  /** Načte (nebo přepoužije) svět pro lokalitu a denní dobu. */
  loadWorld(siteId, timeOfDay) {
    const key = `${siteId}:${timeOfDay}`;
    if (this.world && this.world.key === key) return;
    this.disposeWorld();

    const site = getSite(siteId);
    const tod = TIME_OF_DAY[timeOfDay];
    this.sky.setTimeOfDay(timeOfDay);
    const horizon = this.sky.horizonColor;
    this.scene.background = new THREE.Color(horizon);
    this.scene.fog = new THREE.Fog(horizon, tod.fogNear, tod.fogFar);
    this.sun.position.copy(this.sky.sunDirection);
    if (timeOfDay === 'evening') {
      this.sun.color.set(0xffc48a); this.sun.intensity = 1.2;
      this.hemi.color.set(0xffe2c4); this.hemi.groundColor.set(0x6b6a3a); this.hemi.intensity = 0.95;
    } else {
      this.sun.color.set(0xffe8c8); this.sun.intensity = 1.2;
      this.hemi.color.set(0xdae8f4); this.hemi.groundColor.set(0x5b7a3a); this.hemi.intensity = 1.0;
    }

    const biomes = createBiomes(site);
    const terrain = new ProceduralTerrain(biomes);
    this.scene.add(terrain.getMesh());

    const layers = site.wind.map((l) => ({ ...l, speed: l.speed * tod.windScale }));
    const wind = new WindModel(layers, site.seed);
    const startY = biomes.groundHeight(0, 0);
    const layer = site.cloudLayer?.[timeOfDay];   // oblačná vrstva (jen některé lokality a denní doby)
    const cloud = layer ? { lo: startY + layer.base, hi: startY + layer.top, density: layer.density ?? CLOUD_LAYER.density, color: CLOUD_LAYER.color } : null;
    setHeightFog({ top: startY + tod.fog.above, density: tod.fog.density, color: tod.fog.color, cloud });
    const t = biomes.findMeadow(site.target.bearing, site.target.dist);
    const target = { x: t.x, z: t.z, y: biomes.groundHeight(t.x, t.z) };
    const marker = createTargetMarker();
    marker.position.set(target.x, target.y, target.z);
    this.scene.add(marker);

    const birds = new Birds(biomes);
    this.scene.add(birds.getMesh());

    this.world = { key, site, tod, biomes, terrain, wind, startY, target, marker, birds };
  }

  disposeWorld() {
    this.clearProps();
    if (this.balloon) { this.removeBalloon(); }
    if (!this.world) return;
    this.scene.remove(this.world.terrain.getMesh());
    this.scene.remove(this.world.marker);
    this.scene.remove(this.world.birds.getMesh());
    this.world.birds.dispose();
    disposeTree(this.world.terrain.getMesh());
    disposeTree(this.world.marker);
    this.world = null;
  }

  removeProp(obj) {
    this.props.remove(obj);
    disposeTree(obj);
  }

  clearProps() {
    for (const c of [...this.props.children]) { this.props.remove(c); disposeTree(c); }
  }

  removeBalloon() {
    this.scene.remove(this.balloon.getMesh());
    this.scene.remove(this.balloon.getShadow());
    disposeTree(this.balloon.getMesh());
    this.balloon = null;
  }

  /** Vytvoří balon pro plán, postavený na startu. */
  createBalloon(plan) {
    if (this.balloon) this.removeBalloon();
    const b = new Balloon(plan.physicsConfig(), designCanvas(plan.envelopeId, plan.customCanvas));
    b.physics.refY = this.world.startY;
    b.place(0, this.world.startY, 0, 0);
    this.scene.add(b.getMesh());
    this.scene.add(b.getShadow());
    this.balloon = b;
    return b;
  }

  /** Povrch (včetně koruny stromů) a biom pod bodem. */
  sample(x, z) { return this.world.biomes.sample(x, z); }

  // ---------- Kamera ----------
  setRig(r) {
    Object.assign(this.rig, { cockpit: null }, r);
  }

  /**
   * Blízká rovina kamery roste s výškou nad terénem: tím se zvětší přesnost hloubkového bufferu v dálce
   * (jinak kmitá rozhraní vody a souše). Z koše (cockpit) zůstává malá, aby neořezávala okraj koše.
   */
  adaptNearPlane() {
    const cam = this.camera;
    let near = this.rig.cockpit ? CAMERA.cockpitNear : CAMERA.near;
    if (!this.rig.cockpit && this.world) {
      const h = cam.position.y - this.world.biomes.groundHeight(cam.position.x, cam.position.z);
      near = Math.min(CAMERA.nearMax, Math.max(CAMERA.near, h * CAMERA.nearPerMeter));
    }
    if (Math.abs(cam.near - near) > 0.05) { cam.near = near; cam.updateProjectionMatrix(); }
  }

  resetUserCamera() { this.user.yaw = 0; this.user.pitch = 0; this.user.dist = 0; this.camSnap = true; }

  applyCamera(dt) {
    const r = this.rig;
    const cam = this.camera;
    this.adaptNearPlane();
    if (r.cockpit) {
      const a = r.yaw + this.user.yaw;
      const pitch = -this.user.pitch;   // tažení dolů = pohled vzhůru (kladné pitch = pohled dolů)
      cam.position.copy(r.cockpit);
      cam.lookAt(
        r.cockpit.x + Math.sin(a) * Math.cos(pitch),
        r.cockpit.y + Math.sin(-pitch),
        r.cockpit.z - Math.cos(a) * Math.cos(pitch),
      );
      this.camSnap = true;
      return;
    }
    const a = r.yaw + this.user.yaw;
    const pitch = r.pitch + this.user.pitch;
    const dist = Math.max(8, r.dist + this.user.dist);
    const want = new THREE.Vector3(
      r.target.x - Math.sin(a) * Math.cos(pitch) * dist,
      r.target.y + Math.sin(pitch) * dist,
      r.target.z + Math.cos(a) * Math.cos(pitch) * dist,
    );
    if (this.world) {
      const floor = this.world.biomes.sample(want.x, want.z).surface + 2.5;
      if (want.y < floor) want.y = floor;
    }
    if (this.camSnap) { cam.position.copy(want); this.camSnap = false; }
    else cam.position.lerp(want, 1 - Math.pow(0.002, dt));
    cam.lookAt(r.target.x, r.target.y, r.target.z);
  }

  // ---------- Smyčka ----------
  start() {
    this.sm.change('PLAN');
    this.last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
    };
    requestAnimationFrame(loop);
  }

  frame(dt) {
    if (this.paused) {   // encyklopedie je otevřená: svět stojí, jen se vykresluje
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 6) {
      this.sm.fixedUpdate(FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    this.sm.update(dt);
    const wd = this.world;
    if (wd) {
      this.flagT = (this.flagT || 0) + dt;
      const fw = wd.wind.at(wd.target.y - wd.startY + 36);
      wd.marker.userData.update?.(this.flagT, fw.x, fw.z);
      wd.birds.update(dt, this.camera.position);
    }
    this.settings.setMode(SETTINGS_MODE[this.sm.name] || 'none');
    this.applyCamera(dt);
    this.sky.update(dt, this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  /** Ladicí zkratka: aktuální stav + data. */
  go(name, data) { this.sm.change(name, data); }
}
