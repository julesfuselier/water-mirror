# Water Mirror — notes pour les agents

- Site statique sans framework ni build : HTML dans `public/`, modules ES natifs dans `public/assets/js/`. Ce n'est **pas** un projet Next.js.
- Backend : fonctions serverless Vercel dans `api/` (Node, ESM), code partagé dans `lib/`, Postgres via `@neondatabase/serverless`.
- Toute constante métier (litres de référence, seuil éco, prix au litre) va dans `public/assets/js/config.js`, tout calcul dans `public/assets/js/stats.js`. Ne pas dupliquer ces calculs dans les pages.
- Insérer du texte venant des données ou de l'utilisateur dans le DOM uniquement via `textContent` ou `escapeHtml()`.
- La navigation est générée par `renderNav()` (`ui.js`) dans `<header data-nav="top">` et `<nav data-nav="tabs">` : ne pas la recopier dans les pages.
- Design : un seul fichier `public/assets/css/app.css` (tokens clair/sombre, composants, sections par page). Icônes SVG via `icons.js` (`<i data-icon="nom">`), animations à ressort via `motion.js`. Interface en français.
- Test local : `npm run dev` (données de démo en mémoire si `DATABASE_URL` est absent).
- Accessibilité : préférences (thème, taille du texte, daltonisme, lecture facilitée, animations, contraste) dans `prefs.js`, panneau dans `a11y.js`, appliquées avant l'affichage par le petit script inline du `<head>` de chaque page. Ne jamais transmettre une info par la couleur seule.
