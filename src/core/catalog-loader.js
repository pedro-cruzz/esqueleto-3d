// Fetch only the selected system's metadata. The GLB is requested afterwards.
window.loadAnatomyCatalog = function (system) {
  const files = {
    skeletal: 'anatomy-catalog', muscular: 'muscle-catalog',
    cardiovascular: 'cardiovascular-catalog', nervous: 'nervous-catalog', organs: 'organs-catalog',
  };
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `src/data/${files[system]}.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Catálogo indisponível: ${system}`));
    document.head.append(script);
  });
};
