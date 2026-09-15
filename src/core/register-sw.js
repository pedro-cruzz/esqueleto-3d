if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; location.reload(); }
  });
  window.addEventListener('load', () => navigator.serviceWorker
    .register('service-worker.js', { updateViaCache: 'none' })
    .then(registration => registration.update()).catch(() => {}));
}
