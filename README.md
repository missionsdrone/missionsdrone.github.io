# Missions Drone

Outil gratuit de préparation de vols drone (France) : analyse automatique des contraintes (carte UAS officielle, CTR de l'AIP, aérodromes, zones peuplées, sites militaires et sensibles, espaces protégés), verdict 🟢🟠🔴, « Pour lever » sur chaque contrainte, Cerfa 15476*04 officiel prérempli, courriers aux bons organismes, télépilotes, drones, documents, carnet de vol. Installable sur téléphone, utilisable hors connexion.

## Publier le site
Site 100 % statique : aucun serveur applicatif, aucune base de données, aucun compte.

1. **Compléter `js/config.js`** : nom affiché et mentions légales (éditeur, contact, directeur de la publication, hébergeur) — obligatoires pour un site publié en France.
2. **Héberger le dossier tel quel** (HTTPS obligatoire pour l'installation sur téléphone) :
   - **GitHub Pages** (recommandé : la mise à jour AIP se fait toute seule via `.github/workflows/update-aip.yml`) : créer un dépôt, y pousser le dossier, activer Pages sur la branche principale.
   - **Netlify / Cloudflare Pages / OVH** : glisser-déposer le dossier ; lancer `python3 tools/update_aip.py` puis republier à chaque cycle AIRAC (ou utiliser la tâche Mac ci-dessous).
3. **Vérifier** : ouvrir `tests.html` sur le site publié → « ✅ 36 tests réussis ».
4. À chaque mise en ligne d'une nouvelle version : incrémenter `VERSION` dans `sw.js` et `version` dans `js/config.js`.

## Lancer en local
```bash
python3 -m http.server 8765
```
puis ouvrir http://localhost:8765.

## Sources de données (gratuites, sans clé)
| Donnée | Source |
|---|---|
| Zones de restriction UAS (vectoriel + carte) | DGAC via IGN Géoplateforme (`TRANSPORTS.DRONES.RESTRICTIONS`) |
| Aérodromes (civils/militaires, OACI), héliports, enceintes militaires, champs de tir, établissements pénitentiaires, hôpitaux, stades, commissariats/gendarmeries, espaces protégés, lignes électriques, voies ferrées | IGN BD TOPO (WFS Géoplateforme) |
| Fonds de carte, photos aériennes, géocodage et commune | IGN Géoplateforme (repli : geo.api.gouv.fr) |
| Préfecture, mairie, police municipale | Annuaire de l'administration (service-public.fr) |
| Météo, lever/coucher du soleil | Open-Meteo |
| Natura 2000 (SIC/ZPS), parcs nationaux, réserves, arrêtés de biotope (couches carte) | PatriNat via IGN (WMS) |
| Espaces aériens CTR/TMA/P/R/D (optionnel) | OpenAIP – clé API gratuite à saisir dans « Exploitant » (licence CC BY-NC) |
| Liens directs SIA (fiche AIP par terrain, NOTAM, SUP AIP, AZBA) | Calculés selon le cycle AIRAC (référence 29/10/2026, +28 j) |
| CTR / ATZ (contours, classe, limites), contacts officiels des terrains (tour, opérations militaires, adresses « drones ») | Fiches eAIP AD 2 du SIA, extraites par `tools/build_aip_directory.py` → `data/` |

### Mise à jour AIP automatique
Les fichiers `data/aip-aerodromes.json` et `data/aip-ctr.geojson` suivent le cycle AIRAC (tous les 28 jours).
`tools/update_aip.py` vérifie chaque jour si un nouveau cycle est paru ; si oui, il télécharge les fiches eAIP (≈ 1 min 30),
reconstruit les fichiers, contrôle leur cohérence et ne remplace `data/` que si tout est correct. Sinon il ne fait rien.

- **Sur ce Mac** : `bash tools/install_macos_task.sh` (tous les jours à 7h ; journal : `tools/update_aip.log` ; désinstaller avec `--uninstall`).
- **Site hébergé sur GitHub** : le workflow `.github/workflows/update-aip.yml` fait la mise à jour et publie le commit chaque jour.
- **À la main** : `python3 tools/update_aip.py` (ou `--force`).

Si les données ont plus d'un cycle de retard, l'application l'affiche sur le tableau de bord et dans chaque analyse.

Analyse complète en moins d'une seconde en général (toutes les requêtes en parallèle, jauge de progression).

## Déclaration préfecture
Le formulaire officiel **Cerfa 15476\*04** (`assets/`) est rempli dans le navigateur (pdf-lib) à partir de l'exploitant, du télépilote, du drone et de la mission.
Préavis calculé selon le Cerfa : 10 jours ouvrables pleins (hors dimanches et jours fériés, sans compter le jour d'envoi ni le 1er jour de vol), au plus tôt 1 mois avant.
L'envoi reste bloqué tant que des champs obligatoires ou des pièces justificatives (notice 52053#04 §7) manquent. Le mail est produit en `.eml` avec toutes les pièces jointes.

## Tests
`tests.html` vérifie la logique réglementaire (préavis et jours fériés, cycles AIRAC, CTR, règles par scénario, remplissage du Cerfa). Il utilise un espace de stockage séparé : il ne touche jamais aux données des utilisateurs.

## Stockage
Les données restent dans le navigateur (localStorage, documents joints en IndexedDB, stockage persistant demandé). Sauvegarde/restauration complète (documents inclus) dans « Exploitant » ; rappel sur le tableau de bord après 30 jours.

## Limites connues
- Aide à la préparation : ne remplace ni l'AIP, ni les NOTAM, ni la responsabilité du télépilote.
- NOTAM, SUP AIP, activations RTBA/AZBA et ZICAD : pas de source publique ouverte → rappels et liens directs, pas de détection automatique.
- Contacts des tours : seules les adresses publiées dans l'AIP sont proposées (85 terrains) ; sinon téléphone + Clearance (terrains DSNA).
- Données propres à chaque navigateur (pas de partage d'équipe sans serveur).
- Option openAIP sous licence CC BY-NC (non commerciale).
