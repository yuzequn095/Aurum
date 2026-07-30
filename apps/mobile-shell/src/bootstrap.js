const runtime = globalThis.__AURUM_MOBILE_RUNTIME__;
const diagnostic = document.querySelector('#diagnostic');

if (runtime?.url) {
  window.location.replace(runtime.url);
} else if (diagnostic) {
  diagnostic.textContent = 'AURUM-MOBILE-CONFIG-MISSING · run mobile:prepare';
}
