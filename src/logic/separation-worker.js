// Dense layouts are computed off the UI thread so the model stays interactive.
importScripts('study-logic.js');
self.onmessage = ({ data }) => {
  self.postMessage(self.AnatomyStudyLogic.separatedLayout(data.items, data.gap));
};
