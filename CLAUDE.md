# CLAUDE.md — Home Hub

## Le projet

**Home Hub** est un tableau de bord domotique unique : un seul écran pour accéder aux
appareils de la maison (aujourd'hui éparpillés dans plusieurs applications) et les
contrôler. L'application est destinée à **tourner sur un Raspberry Pi**.

## La stack

- **Backend :** Node.js avec **NestJS** (API REST)
- **Frontend :** Angular
- **Base de données :** MongoDB

### Commandes clés

> Ces commandes seront ajoutées au fur et à mesure que le monorepo prend forme.
> Mettre à jour cette section dès qu'une commande change.

- **Backend** (`backend/`)
  - Démarrer l'API : `npm run start:dev` (mode watch NestJS)
  - Build : `npm run build`
  - Tests : `npm test`
  - Lint : `npm run lint`
- **Frontend** (`frontend/`)
  - Démarrer le front : `npm start` (serveur de dev Angular)
  - Build de prod : `npm run build`
  - Tests : `npm test`
  - Lint : `npm run lint`

## Conventions

- **Langue :** la conversation avec Claude Code se fait **en français**. En revanche,
  **le code, les noms de variables, les commentaires et l'UI sont en anglais.**
- **Contraintes de performance (Raspberry Pi) :** la cible est une machine à
  ressources limitées (CPU/RAM faibles, stockage lent). Garder l'empreinte mémoire
  basse, éviter les dépendances lourdes, préférer les solutions simples et efficaces.
  Toute décision technique doit tenir compte de ces contraintes.
- **Style de commit :** messages courts et impératifs en anglais, préfixés par un type
  (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Un commit par point de
  validation.

## Règle de collaboration

**Propose un plan et attends ma validation avant d'écrire ou de modifier des fichiers.**

Je garde la main à chaque étape : décris ce que tu comptes faire, attends mon feu vert,
puis exécute en me laissant approuver chaque écriture.
