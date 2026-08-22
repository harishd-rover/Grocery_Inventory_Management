const fs = require('node:fs')
const path = require('node:path')

const nativeLoader = path.join(__dirname, '..', 'node_modules', 'rollup', 'dist', 'native.js')
if (!fs.existsSync(nativeLoader)) process.exit(0)

let source = fs.readFileSync(nativeLoader, 'utf8')
const nativeRequire = 'existsSync(path.join(__dirname, localName)) ? localName : `@rollup/rollup-${packageBase}`'
if (source.includes(nativeRequire)) {
  source = source.replace(nativeRequire, "'@rollup/wasm-node/dist/native.js'")
  fs.writeFileSync(nativeLoader, source)
}
