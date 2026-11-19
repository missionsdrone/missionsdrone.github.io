/* Configuration du site — à compléter avant publication */
const APP = {
  name: 'Missions Drone',          // nom affiché (modifiable en un seul endroit)
  version: '1.1.0',
  url: 'https://missionsdrone.com',
  publisher: {                    // mentions légales (art. 6 LCEN)
    status: 'particulier',        // 'particulier' (non professionnel) ou 'professionnel' (dès que le site est monétisé)
    name: 'Clément Bernagaud',
    address: '',                  // facultatif pour un particulier : l'adresse est communiquée à l'hébergeur
    email: 'clement@bernagaud.com',
    siret: '',                    // obligatoire en cas d'activité professionnelle
    director: 'Clément Bernagaud', // directeur de la publication
    host: 'GitHub, Inc. (GitHub Pages) – 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis – https://github.com'
  }
};
document.querySelectorAll('[data-app-name]').forEach(e => { e.textContent = APP.name; });
