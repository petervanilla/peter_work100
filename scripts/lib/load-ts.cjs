/*
 * 테스트 스크립트가 src/*.ts 를 그대로 불러올 수 있게 하는 작은 로더.
 * (빌드 결과가 아니라 실제 소스를 검증하기 위함. '@/…' 별칭도 처리)
 */
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  Module._extensions[".ts"] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    });
    module._compile(outputText, filename);
  };
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    const mapped = request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request;
    return resolve.call(this, mapped, ...rest);
  };
}

function loadTs(relativePath) {
  install();
  return require(path.join(root, relativePath));
}

module.exports = { loadTs, root };
