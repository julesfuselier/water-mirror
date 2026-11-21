# Water Mirror — notes pour les agents

- Site statique sans framework ni build : HTML dans `public/`, modules ES natifs dans `public/assets/js/`. Ce n'est **pas** un projet Next.js.
- Backend : fonctions serverless Vercel dans `api/` (Node, ESM), code partagé dans `lib/`, Postgres via `@neondatabase/serverless`.
- Toute constante métier (litres de référence, seuil éco, prix au litre) va dans `public/assets/js/config.js`, tout calcul dans `public/assets/js/stats.js`. Ne pas dupliquer ces calculs dans les pages.
- Insérer du texte venant des données ou de l'utilisateur dans le DOM uniquement via `textContent` ou `escapeHtml()`.
- La navigation est générée par `renderNav()` (`ui.js`) dans les `<nav data-nav="sidebar|bottom">` : ne pas la recopier dans les pages.
- Test local : `npm run dev` (données de démo en mémoire si `DATABASE_URL` est absent).
