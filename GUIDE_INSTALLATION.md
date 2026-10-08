# Installation du blogue MADIC avec Decap CMS

## Ce que contient le dossier
- `blogue.html` : page complète, navigation et pied de page repris du fichier fourni, avec blogue dynamique.
- `article.html` : page de lecture des articles.
- `css/blogue-cms.css` : mise en page inspirée de TKAB, auteur à gauche, articles récents et archives à droite.
- `js/blogue-cms.js` : affichage des articles, des archives et des publications récentes.
- `admin/index.html` et `admin/config.yml` : interface de rédaction Decap CMS.
- `contenu/articles/*.json` : deux articles initiaux, éditables dans Decap CMS.
- `build_articles.py` et `.github/workflows/blogue.yml` : mise à jour automatique de `data/articles.json` après publication sur GitHub.

## Installation
1. Copiez le contenu de ce dossier **à la racine du dépôt** de votre site MADIC, en conservant les dossiers existants (`img`, `css`, `js`). Faites d'abord une sauvegarde de votre ancien `blogue.html`.
2. Si votre page originale a changé depuis le fichier utilisé, ne remplacez pas aveuglément la navigation : prenez plutôt le contenu de `blogue-main.html` et remplacez uniquement son `<main>`; ajoutez les références à `css/blogue-cms.css` et `js/blogue-cms.js`.
3. Le dépôt `Moussabdi/MAD-Immigration-Canadienne-v01` est déjà configuré dans `admin/config.yml`. Vérifiez que la branche par défaut est `main`.
4. Configurez **l'authentification OAuth GitHub** pour Decap CMS. La simple présence du fichier `admin/config.yml` ne permet PAS de se connecter : utilisez un fournisseur d'authentification compatible (p. ex. OAuth via Netlify ou un serveur OAuth personnel). Voir https://decapcms.org/docs/github-backend/ et https://decapcms.org/docs/backends-overview/ . Avec un proxy OAuth externe, renseignez `backend.base_url` et éventuellement `backend.auth_endpoint` selon son fournisseur. Ne placez jamais un secret OAuth dans le dépôt.
5. Dans GitHub, activez Actions si nécessaire et accordez aux workflows la permission de **lecture et écriture** sur le dépôt (`Settings > Actions > General > Workflow permissions`). Si la branche principale est protégée, adaptez la politique de contribution de l'action.
6. Poussez les fichiers sur GitHub. Ouvrez `https://VOTRE-DOMAINE/admin/` pour rédiger et publier. L'action GitHub actualisera `data/articles.json` et les pages liront ce catalogue automatiquement.
7. Pour tester localement, lancez `python -m http.server 8000` depuis la racine du site, puis ouvrez `http://localhost:8000/blogue.html`. **Ne pas** ouvrir en `file://`.

## Publier un article
`/admin/` > `Articles du blogue` > `Nouvel article` > saisir titre, date, auteur, photo, catégorie, image, résumé et contenu > activer `Publier` > enregistrer. Après l'exécution de l'action GitHub et le déploiement du site, l'article apparaît sur le blogue, dans les publications récentes et dans les archives.

## Points à vérifier
- Les deux articles de 2020 ont été conservés à titre d'exemple, mais le premier contient des références à la **législation française** (OFII, Halde) qui doivent être revues avant publication pour un site d'immigration canadienne.
- Les deux articles d'origine sont attribués provisoirement à **Équipe MADIC**, sans présumer de leur véritable auteur.
- Les images initiales (`img/parrainage_5.png`, `img/ImmigrationTemporaire_2.png`) doivent exister dans votre site. Pour une nouvelle photo d'auteur, utilisez le champ de téléchargement dans l'administration.
- La nouvelle interface de rédaction utilise des libellés français; les nouveaux articles ne sont pas traduits automatiquement en anglais. Une gestion éditoriale bilingue peut être ajoutée ensuite.
- Si le site est hébergé sur GitHub Pages dans un **sous-chemin** (`utilisateur.github.io/depot/`), les chemins de navigation et les URL doivent être ajustés. La configuration fournie suppose un domaine ou un hébergement à la racine.
- Le rendu Markdown sur `article.html` utilise Marked + DOMPurify depuis des CDN publics. Sans accès à ces CDN, le texte reste lisible, mais la mise en forme Markdown est simplifiée.

## Dépôt configuré
- https://github.com/Moussabdi/MAD-Immigration-Canadienne-v01
- Si GitHub Pages utilise son URL de projet (sans domaine personnalisé), l’adresse prévue est `https://moussabdi.github.io/MAD-Immigration-Canadienne-v01/` et le chemin `/admin/` doit être précédé du nom du dépôt. Les liens absolus doivent être vérifiés.
- L’authentification OAuth doit être configurée avant la connexion Decap CMS.
