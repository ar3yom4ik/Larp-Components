declare module 'virtual:pre-rust-engine' {
  export { Engine } from '../src/sim/engine';
}

declare module 'virtual:old-rust-bridge' {
  export * from '../src/sim/wasm/kernel';
}
