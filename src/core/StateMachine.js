// Jednoduchý automat herních stavů: PLAN → LAUNCH → FLIGHT → LANDING → CELEBRATION.
export class StateMachine {
  constructor() {
    this.states = {};
    this.current = null;
    this.name = null;
  }

  register(name, state) { this.states[name] = state; }

  change(name, data) {
    this.current?.exit?.();
    this.name = name;
    this.current = this.states[name];
    this.current.enter?.(data);
  }

  fixedUpdate(dt) { this.current?.fixedUpdate?.(dt); }
  update(dt) { this.current?.update?.(dt); }
}
