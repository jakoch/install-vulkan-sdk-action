// Babel config for Jest only. The published action is bundled by esbuild
// (see the "build" script), which does its own transpiling and does not use
// this config. This exists so Jest can strip TypeScript types via
// babel-jest, which keeps the test runner independent of the TypeScript
// compiler version.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '24' } }],
    ['@babel/preset-typescript', {}]
  ]
}
