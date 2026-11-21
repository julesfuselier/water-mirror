# Water Mirror 💧

Boîtier connecté (ESP32 + débitmètre) qui mesure chaque douche, et web app familiale qui transforme ces mesures en jeu : mascotte Goutti, classement familial, quêtes, impact collectif.

En ligne : https://water-mirror.vercel.app

## Architecture

```
ESP32 ──(Wi-Fi, clé device)──▶ /update ou POST /api/showers ──▶ Postgres (Neon)
                                                                    │
Navigateur ◀── pages statiques (public/) ◀── GET /api/showers ◀─────┘
```

| Dossier | Contenu |
| --- | --- |
| `public/` | Le site (HTML/CSS/JS sans build). `index.html` = choix du profil, `dashboard.html` = accueil perso |
| `public/assets/css/app.css` | Design system : couleurs (clair/sombre), typo Inter, composants, styles des pages |
| `public/assets/js/` | Modules partagés : `config.js` (constantes métier), `api.js`, `session.js`, `stats.js` (calculs), `ui.js` (nav, sheets, helpers), `icons.js`, `motion.js` (ressorts), `format.js` (nombres en français) |
| `public/assets/js/pages/` | La logique de chaque page |
| `api/` | Fonctions serverless Vercel |
| `lib/` | Accès base de données, validation, helpers HTTP |
| `db/` | Schéma SQL + historique de démo (ancien `donnees.json`) |
| `scripts/` | Serveur de dev local et import des données |
| `design/unused-assets/` | Images non utilisées par le site (fonds du futur shop, etc.), non déployées |

## API

| Méthode | Route | Auth | Rôle |
| --- | --- | --- | --- |
| GET | `/api/showers[?user=Alex]` | — | Historique des douches (plus ancienne en premier) |
| POST | `/api/showers` | clé device | Ajoute une douche `{ "user": "Alex", "liters": 12.5, "duration": "3m10s" }` |
| GET/POST | `/update?user=Alex&liters=12.5&duration=3m10s` | clé device | Route compatible avec l'ancien firmware ESP32 |
| POST | `/api/reset` | clé admin | Efface tout l'historique |
| POST | `/api/leads` | — | Enregistre un contact du calculateur (consentement obligatoire) |
| GET | `/api/leads[?format=csv]` | clé admin | Liste ou export CSV des contacts |
| DELETE | `/api/leads?email=...` | clé admin | Supprime un contact (demande RGPD) |

La clé s'envoie dans l'en-tête `x-api-key` ou en paramètre `?key=`.
`duration` accepte des minutes (`3.5`) ou le format `3m30s`. Ajouter `device=<id>` permet d'identifier le boîtier, et `createdAt` (date ISO) d'envoyer une mesure faite hors ligne.

## Calculateur & collecte de contacts

Page publique `/calculateur` (« Combien coûte vraiment ta douche ? ») : calcul en direct, bouton de partage, puis formulaire pour être recontacté (lancement, test du boîtier, partenariat). Les contacts vont dans la table `leads` (un par e-mail, créée automatiquement).

- Suivre la provenance : partager le lien avec `?utm_source=instagram&utm_campaign=lancement` (TikTok, flyers avec QR code, etc.).
- Récupérer les contacts (CSV pour Excel ou Brevo/Mailchimp) : `https://water-mirror.vercel.app/api/leads?format=csv&key=<ADMIN_API_KEY>`
- Constantes du calcul (prix de l'eau, du kWh, débits) et adresse de contact RGPD : `public/assets/js/config.js`.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans base de données, le serveur local utilise les données de démo de `db/seed-data.json` (en mémoire, remises à zéro au redémarrage).
Pour travailler sur la vraie base : `npx vercel link` puis `npx vercel env pull .env.local`.

## Mise en ligne (Vercel)

Chaque `git push` sur `main` redéploie le site. Variables d'environnement du projet Vercel :

- `DATABASE_URL` : ajoutée automatiquement en connectant une base **Neon** (onglet Storage du projet)
- `DEVICE_API_KEY` : clé que l'ESP32 envoie avec chaque mesure
- `ADMIN_API_KEY` : clé demandée par le bouton « Reset Family »

La table `showers` se crée toute seule au premier appel. Pour importer l'historique de démo dans la base en ligne : `npm run seed -- --remote https://water-mirror.vercel.app`.

## Firmware ESP32

Remplacer l'ancienne URL `http://<ip-du-pc>:5001/update?...` par :

```
https://water-mirror.vercel.app/update?user=<profil>&liters=<litres>&duration=<durée>&key=<DEVICE_API_KEY>
```

(HTTPS : utiliser `WiFiClientSecure` côté ESP32.)

## Constantes métier

Tout est dans `public/assets/js/config.js` : douche de référence (60 L), seuil « éco » (40 L), prix estimé du litre d'eau chaude, fréquence de rafraîchissement.
