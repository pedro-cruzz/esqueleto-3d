// Shared catalog for the main menu and the study sidebar.
window.ANATOMY_SYSTEMS = [
  { id: 'skeletal', name: 'Sistema esquelético', description: 'Ossos, articulações e estruturas de suporte. Explore o corpo inteiro ou estude cada peça separadamente.', available: true, model: 'public/models/esqueleto-anatomico.glb', catalog: 'skeletal' },
  { id: 'muscular', name: 'Sistema muscular', description: 'Músculos e suas relações com os ossos e os movimentos do corpo.', available: true, model: 'public/models/musculos.glb', catalog: 'muscular' },
  { id: 'nervous', name: 'Sistema nervoso', description: 'Encéfalo, medula espinal e nervos, organizados para o estudo de suas conexões.', available: false, catalog: 'nervous' },
  { id: 'organs', name: 'Órgãos e sistemas', description: 'Órgãos internos e sua organização nos diferentes sistemas do corpo.', available: false, catalog: 'organs' },
];
