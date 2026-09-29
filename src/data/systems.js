// Shared catalog for the main menu and the study sidebar.
window.ANATOMY_SYSTEMS = [
  { id: 'skeletal', name: 'Sistema esquelético', description: 'Ossos, articulações e estruturas de suporte. Explore o corpo inteiro ou estude cada peça separadamente.', available: true, model: 'public/models/esqueleto-anatomico.glb', catalog: 'skeletal' },
  { id: 'muscular', name: 'Sistema muscular', description: 'Músculos e suas relações com os ossos e os movimentos do corpo.', available: true, model: 'public/models/musculos.glb', catalog: 'muscular' },
  { id: 'cardiovascular', name: 'Sistema cardiovascular', description: 'Câmaras cardíacas, artérias e veias. Isole os vasos ou explore suas relações em 3D.', available: true, preview: true, model: 'public/models/cardiovascular.glb', catalog: 'cardiovascular' },
  { id: 'nervous', name: 'Sistema nervoso', description: 'Encéfalo, medula, nervos e estruturas dos sentidos. Explore cada estrutura individualmente.', available: true, preview: true, model: 'public/models/nervoso.glb', catalog: 'nervous' },
  { id: 'organs', name: 'Órgãos e sistemas', description: 'Estruturas digestórias, respiratórias, urinárias, endócrinas e genitais do modelo masculino.', available: true, preview: true, model: 'public/models/orgaos.glb', catalog: 'organs' },
];
