import type { Camera } from 'three';

/** Finite temporal convergence in an otherwise render-on-demand editor. */
export class TemporalFrames {
  private remaining = 0;
  private previous: number[] | null = null;
  constructor(readonly samples = 32) {}
  reset() { this.remaining = this.samples; }
  observe(camera: Camera) {
    const values = [...camera.position.toArray(), ...camera.quaternion.toArray(), ...camera.projectionMatrix.elements];
    if (!this.previous || values.some((value, index) => value !== this.previous![index])) {
      this.previous = values;
      this.reset();
    }
  }
  rendered() { if (this.remaining > 0) this.remaining -= 1; }
  get pending() { return this.remaining > 0; }
}
