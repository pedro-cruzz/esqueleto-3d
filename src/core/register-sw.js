const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

if ('serviceWorker' in navigator && isLocalDevelopment) {
  // Um servidor local parado não deve continuar exibindo código antigo offline.
  const workerURL = new URL('service-worker.js', location.href).href;
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    for (const registration of registrations) {
      const worker = registration.active || registration.waiting || registration.installing;
      if (worker?.scriptURL === workerURL) await registration.unregister();
    }
    if (navigator.serviceWorker.controller?.scriptURL === workerURL) location.reload();
  }).catch(console.warn);
} else if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; location.reload(); }
  });
  window.addEventListener('load', () => navigator.serviceWorker
    .register('service-worker.js', { updateViaCache: 'none' })
    .then(registration => registration.update()).catch(() => {}));
}
