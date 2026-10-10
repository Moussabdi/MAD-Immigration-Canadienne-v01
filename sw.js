/* MADIC PWA : pas de cache de donnees privees ni de pages authentifiees. */
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
/* Le reseau reste la source de verite : pas d'interception fetch pour les dossiers et contrats. */
