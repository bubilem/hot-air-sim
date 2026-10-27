// Fáze 1: Plánování letu. Pozadí = pomalu rotující pohled na balon na startovní louce.
import { PlanScreen } from '../ui/PlanScreen.js';
import { PlanScene } from './PlanScene.js';
import { t } from '../i18n/index.js';

export class PlanPhase {
  constructor(app) {
    this.app = app;
    this.screen = null;
    this.scene = new PlanScene(app);   // auto, vlek, lidé a láhve kolem balonu
    this.t = 0;
  }

  enter() {
    const app = this.app;
    app.hud.setVisible(false);
    app.controls.setVisible(false);
    app.controls.enabled = false;
    app.audio.update({});
    app.clearProps();   // zbytky po startu / přistání (auto, vlek, posádka) nemají být vidět
    this.scene.group = null;
    if (app.fleet.length && !app.plan.envelopeTouched && app.plan.envelopeId === 'checker') app.plan.envelopeId = app.fleet[0].id;   // výchozí je první balon z galerie, nastaví se dřív, než se balon vytvoří
    if (!this.screen) {
      this.screen = new PlanScreen(app.uiRoot, app.plan, {
        onChange: (kind) => this.onChange(kind),
        onStart: () => this.start(),
        getFleet: () => app.fleet,
        onSettings: (anchor) => app.settings.toggle(anchor),
        onWiki: () => app.settings.openWiki(),
      });
      app.fleetReady.then((fleet) => {
        if (fleet.length && !app.plan.envelopeTouched && app.plan.envelopeId === 'checker') {
          app.plan.envelopeId = fleet[0].id;
          if (app.balloon && app.sm.name === 'PLAN') { app.createBalloon(app.plan); this.scene.rebuild(app.plan); }
        }
        this.screen.buildDesignButtons();
      });
    }
    this.refreshWorld(true);
    this.screen.show();
    app.resetUserCamera();
  }

  exit() { this.screen.hide(); this.scene.clear(); }

  refreshWorld(force = false) {
    const app = this.app, plan = app.plan;
    app.loadWorld(plan.siteId, plan.timeOfDay);
    if (force || !app.balloon) app.createBalloon(plan);
    this.scene.rebuild(plan);
  }

  onChange(kind) {
    const app = this.app, plan = app.plan;
    if (kind === 'lang') { app.rebuildUi(); document.title = t('app.title'); return; }
    if (kind === 'crew') { this.scene.rebuild(plan); return; }
    if (kind === 'world' || kind === 'load') {
      app.loadWorld(plan.siteId, plan.timeOfDay);
      app.createBalloon(plan);
      this.scene.rebuild(plan);
    }
  }

  start() {
    const app = this.app;
    app.audio.unlock();
    app.plan.name = (app.plan.name || '').trim();
    if (app.params.has('skip')) {
      app.go('FLIGHT', { fresh: true, alt: parseFloat(app.params.get('alt') || '0') });
      return;
    }
    app.go('LAUNCH');
  }

  update(dt) {
    const app = this.app;
    this.t += dt;
    const b = app.balloon;
    if (!b) return;
    b.setFlightPose();
    b.syncView(app.world.startY);
    this.scene.update(dt);
    app.setRig({
      target: { x: -3, y: app.world.startY + 8, z: 2 },
      yaw: -this.t * 0.12,
      pitch: 0.2,
      dist: 50,
    });
  }
}
