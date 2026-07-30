const retryButton = document.querySelector('#retry');
const diagnostic = document.querySelector('#diagnostic');
const runtime = globalThis.__AURUM_MOBILE_RUNTIME__;

if (retryButton instanceof HTMLButtonElement) {
  if (runtime?.url) {
    retryButton.addEventListener('click', () => {
      retryButton.disabled = true;
      retryButton.textContent = 'Retrying…';
      window.location.replace(runtime.url);
    });
  } else {
    retryButton.disabled = true;
    if (diagnostic) {
      diagnostic.textContent = 'AURUM-MOBILE-CONFIG-MISSING · resync the native project';
    }
  }
}
