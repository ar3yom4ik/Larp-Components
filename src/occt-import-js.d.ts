declare module "occt-import-js" {
  // The published package does not include TypeScript declarations.
  const factory: (options: {wasmBinary: Uint8Array}) => Promise<any>;
  export default factory;
}
