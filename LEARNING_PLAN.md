# Plan d'apprentissage — Développer avec des agents Claude Code

> **But du plan.** Apprendre la *création* et l'*utilisation* d'agents Claude Code,
> étape par étape, en construisant une vraie application : **Home Hub**, un tableau
> de bord unique pour accéder et contrôler les appareils de la maison, aujourd'hui
> éparpillés dans plusieurs applications.
>
> **Ce qui compte ici :** ce n'est pas de livrer l'app le plus vite possible, c'est
> de comprendre *comment on pilote une équipe d'agents* et *comment on garde la main*.
> L'application est le prétexte concret. À chaque étape tu valides avant d'avancer.

---

## Règles du jeu (à lire une fois, à respecter tout du long)

- **Stack imposée :** Node.js (API backend) + Angular (frontend) + MongoDB (données), le tout tournant sur un Raspberry Pi.
- **Langue :** tu converses avec Claude Code **en français** ; le code, les noms de variables, les commentaires et l'UI sont **en anglais**. → Cette règle ira dans le `CLAUDE.md` du projet pour que tous les agents la respectent.
- **Tu gardes la main :** tu valides **chaque étape**. On configure Claude Code pour qu'il propose et attende ton feu vert avant toute action qui écrit ou modifie des fichiers.
- **Un agent = un rôle.** On construit progressivement une petite équipe : Architect, Backend, Frontend, Tester. On **n'ajoute pas** tous les agents d'un coup — on les introduit quand le besoin se fait sentir, pour comprendre *pourquoi* chacun existe.
- **Nouvelle règle métier :** chaque ajout d'un *device* ou d'un *contrôle* dans l'app se fait en formulant une **demande aux agents**, pas en codant à la main. C'est l'exercice répété qui ancre l'apprentissage.

---

## Concepts que tu maîtriseras à la fin

| Concept | Ce que c'est | Où on l'apprend |
|---|---|---|
| `CLAUDE.md` | Le « règlement » du projet, lu par Claude à chaque session | Module 1 |
| Plan Mode | Claude planifie sans exécuter, tu valides le plan | Module 2 |
| Sous-agent (subagent) | Instance Claude isolée, avec son propre contexte, prompt système, outils et permissions | Module 3+ |
| Restriction d'outils | Limiter ce qu'un agent peut faire (lecture seule vs écriture) | Module 4 |
| Passage de contexte | Comment l'info circule du parent vers un sous-agent (le piège n°1) | Module 4 |
| Slash command / Skill | Un playbook réutilisable que tu déclenches avec `/nom` | Module 6 |
| Hook | Un script déterministe déclenché par un événement (garde-fou, formatage) | Module 7 |
| Orchestration multi-agents | Enchaîner Architect → Backend → Frontend → Tester en pipeline | Module 8 |

---

# Module 0 — Préparation de l'environnement

**Objectif d'apprentissage :** avoir un poste de travail fonctionnel et comprendre où « vit » la configuration de Claude Code.

**À faire :**
1. Installe Claude Code et l'extension dans VSCode. Vérifie la version avec `/help` dans une session.
2. Crée le dossier du projet : `home-hub/`, ouvre-le dans VSCode.
3. Initialise git : `git init`. **Important pour garder la main** : le versioning te permet de revenir en arrière si un agent part dans une mauvaise direction. C'est ton filet de sécurité.
4. Repère la structure de configuration de Claude Code (tu la rempliras au fil des modules) :
   ```
   home-hub/
     .claude/
       agents/        ← tes sous-agents (Modules 3+)
       commands/      ← tes slash commands (Module 6)
       settings.json  ← permissions et hooks (Modules 1 et 7)
     CLAUDE.md        ← le règlement du projet (Module 1)
   ```

**Point de validation :** tu ouvres une session Claude Code dans `home-hub/`, tu tapes `/help`, tu obtiens la liste des commandes. ✅

**Ce que tu dois avoir compris :** la config de Claude Code est faite de fichiers texte dans `.claude/`, versionnés avec ton code. Rien de magique.

---

# Module 1 — Le `CLAUDE.md` : donner un cadre à Claude

**Objectif d'apprentissage :** comprendre que le `CLAUDE.md` est la première brique de tout travail agentique. C'est le contexte que Claude lit à **chaque** session, sans que tu aies à le répéter.

**À faire :**
1. Demande à Claude Code (en français) de générer un premier `CLAUDE.md`. Beaucoup de versions ont une commande dédiée pour scanner le projet et proposer un brouillon — sinon écris-le à la main. Il doit contenir au minimum :
   - **Le projet** : Home Hub, tableau de bord domotique, tourne sur Raspberry Pi.
   - **La stack** : Node.js + Angular + MongoDB, avec les commandes clés (`npm run build`, `npm test`, `npm run lint`, comment démarrer l'API et le front).
   - **Les conventions** : code et commentaires **en anglais**, contraintes de perf pour le Raspberry Pi (ressources limitées), style de commit.
   - **La règle de collaboration** : « Propose un plan et attends ma validation avant d'écrire des fichiers. »
2. Ouvre une nouvelle session, pose une question banale sur le projet, et observe : Claude connaît déjà le contexte. C'est le `CLAUDE.md` qui opère.
3. **Configure la validation par défaut.** Dans `.claude/settings.json`, mets Claude en mode où les actions d'écriture demandent ta permission. Familiarise-toi avec le fait que tu peux approuver/refuser chaque action.

**Exercice de démarrage app :** demande un plan (juste un plan, pas de code) pour la structure initiale du monorepo `home-hub` (dossiers `backend/`, `frontend/`, config partagée). Valide ou corrige le plan. **Ne laisse rien écrire encore.**

**Point de validation :** un `CLAUDE.md` versionné, et tu as vu Claude te *demander* avant d'agir. ✅

**Ce que tu dois avoir compris :** avant de créer le moindre agent, un bon contexte partagé (`CLAUDE.md`) élimine des dizaines de corrections. Les agents que tu créeras hériteront de ce cadre.

---

# Module 2 — Plan Mode : penser avant d'agir, et valider

**Objectif d'apprentissage :** utiliser le Plan Mode pour que Claude explore et propose une stratégie *sans rien exécuter*. C'est le cœur de « garder la main ».

**À faire :**
1. Active le Plan Mode et demande (en français) : « Planifie la mise en place du squelette backend Node.js : serveur Express minimal, connexion MongoDB, un endpoint `GET /health`. »
2. Observe que Claude peut lancer une exploration en lecture seule (souvent via un agent d'exploration intégré) pour cartographier le projet, puis te rend un **plan distillé** sans avoir touché aux fichiers.
3. Lis le plan de façon critique. Corrige-le en français. Valide-le.
4. **Seulement après validation**, laisse-le implémenter cette première brique, en approuvant chaque écriture de fichier.
5. Fais tourner `GET /health`. Commit.

**Exercice de démarrage app :** répète la boucle pour le squelette Angular (une page vide « Home Hub » qui s'affiche). Toujours : plan → validation → exécution surveillée → commit.

**Point de validation :** backend et frontend démarrent séparément sur ta machine (pas encore le Pi). Deux commits propres. ✅

**Ce que tu dois avoir compris :** la boucle **plan → validation → exécution → commit** est ton rythme de travail pour tout le reste. Les agents ne changeront pas ce rythme, ils le spécialiseront.

---

# Module 3 — Ton premier sous-agent : l'Architect

**Objectif d'apprentissage :** créer un sous-agent et comprendre *pourquoi* on isole un rôle dans son propre contexte.

**Rappel conceptuel.** Un sous-agent est une instance Claude séparée, avec sa propre fenêtre de contexte, son propre prompt système, sa propre liste d'outils et ses propres permissions. Quand une tâche correspond à sa description, Claude lui délègue ; il travaille seul et ne renvoie que son résultat final. Tout le « bruit » (lectures de fichiers, recherches) reste dans *son* contexte et ne pollue pas ta conversation principale.

**À faire :**
1. Crée `.claude/agents/architect.md`. Format : Markdown avec frontmatter YAML (`name`, `description`, `tools` optionnel, `model` optionnel).
   ```markdown
   ---
   name: architect
   description: MUST BE USED before any implementation. Designs architecture, breaks down features, defines API contracts and data schemas. Does not write application code.
   tools: Read, Grep, Glob
   ---

   You are a senior software architect for the Home Hub project.
   You do NOT write application code.
   When invoked:
   1. Analyse the request and existing project patterns.
   2. Produce a clear spec: data schemas (MongoDB), REST API contracts, component breakdown.
   3. Write the spec to a file under `docs/adr/` so other agents can read it.
   4. Document assumptions and Raspberry Pi constraints (limited CPU/RAM).
   End every spec with a checklist that Backend and Frontend must follow.
   Be critical and realistic; flag technical risks.
   ```
   *(Note la restriction `tools: Read, Grep, Glob` : lecture seule. L'architecte pense, il ne code pas — c'est délibéré.)*
2. Dans une session, invoque-le explicitement : « Utilise le sous-agent architect pour concevoir le modèle de données d'un *device* et le contrat de l'API qui liste les devices. »
3. Observe : il produit une spec et l'écrit dans `docs/adr/`. Ta conversation principale reste légère.
4. **Tu valides la spec.** C'est ton point de contrôle. Corrige en français si besoin.

**Point de validation :** un fichier de spec (ADR) validé par toi, écrit par l'agent architect. ✅

**Ce que tu dois avoir compris :** un sous-agent = un rôle + un contexte isolé + des outils limités. L'architecte en lecture seule ne *peut pas* casser ton code : la restriction d'outils est aussi une sécurité.

---

# Module 4 — Le passage de contexte (le piège n°1) + l'agent Backend

**Objectif d'apprentissage :** comprendre que les sous-agents ne partagent PAS ta conversation, et apprendre à leur transmettre ce dont ils ont besoin. Puis créer un agent qui écrit du code.

**Concept clé à intérioriser.** La fenêtre de contexte d'un sous-agent démarre **vierge** : il ne voit ni ta conversation, ni ce qu'un autre agent a produit en mémoire. Le seul canal, c'est le texte de la tâche que tu lui passes. Donc : **il faut lui indiquer explicitement les chemins de fichiers, les décisions, les messages d'erreur** dont il a besoin. C'est pour ça qu'au Module 3 on a fait écrire la spec de l'architecte **dans un fichier** : le Backend pourra la lire.

**À faire :**
1. Crée `.claude/agents/backend.md` :
   ```markdown
   ---
   name: backend
   description: Implements Node.js server logic, REST endpoints and MongoDB access, strictly following the architect's API contracts.
   tools: Read, Write, Edit, Bash, Grep, Glob
   ---

   You are a backend engineer for Home Hub (Node.js + MongoDB on Raspberry Pi).
   You implement strictly according to the API contract provided by the architect.
   Always read the relevant spec under `docs/adr/` first — its path will be given to you.
   Write unit tests for every endpoint.
   Never change a contract silently; if a contract seems wrong, stop and report it.
   Keep resource usage low (Raspberry Pi).
   ```
   *(Ici les outils incluent `Write`, `Edit`, `Bash` : cet agent agit vraiment.)*
2. Invoque-le en lui **donnant explicitement le chemin de la spec** : « Utilise le sous-agent backend pour implémenter l'API des devices d'après `docs/adr/001-devices.md`. »
3. Fais l'expérience inverse une fois, exprès : invoque-le *sans* donner le chemin, et observe qu'il est perdu ou qu'il invente. → C'est la leçon la plus importante du module.
4. Valide le code produit, lance les tests, commit.

**Point de validation :** l'API `GET /devices` + son test passent, et tu as *vécu* la différence entre « avec contexte » et « sans contexte ». ✅

**Ce que tu dois avoir compris :** orchestrer des agents, c'est surtout **bien faire circuler l'information** entre eux via des fichiers et des prompts explicites. Un agent brillant sans le bon contexte échoue.

---

# Module 5 — L'agent Frontend et la première verticale complète

**Objectif d'apprentissage :** faire collaborer deux agents implémenteurs (Backend déjà là, Frontend nouveau) sur une même feature de bout en bout.

**À faire :**
1. Crée `.claude/agents/frontend.md` sur le même modèle (Angular ; il lit les mêmes contrats d'API sous `docs/adr/` ; outils `Read, Write, Edit, Bash, Grep, Glob`). Son prompt insiste sur : consommer l'API telle que définie, ne pas réinventer les contrats, UI en anglais.
2. Enchaîne manuellement (tu es l'orchestrateur pour l'instant) :
   - architect → spec de la vue « liste des devices » (si pas déjà couverte),
   - backend → endpoint prêt,
   - frontend → composant Angular qui appelle l'API et affiche la liste.
3. Valide à chaque passage de relais. Commit à chaque étape.

**Exercice de démarrage app — le geste que tu répéteras :** ajoute ton **premier vrai device** (par ex. une lampe) en formulant la demande aux agents : « architect : conçois le modèle et le contrôle on/off d'une lampe ; backend : implémente ; frontend : ajoute le bouton de contrôle. » Valide chaque étape.

**Point de validation :** dans le navigateur, la page Home Hub liste tes devices et tu peux allumer/éteindre la lampe (mock si le vrai device n'est pas branché). ✅

**Ce que tu dois avoir compris :** une feature = une chaîne de rôles. Pour l'instant *c'est toi* qui passes le relais entre agents et qui valides. Les modules suivants vont fiabiliser et semi-automatiser cette chaîne — sans jamais te retirer la validation.

---

# Module 6 — Slash commands / Skills : capturer un workflow réutilisable

**Objectif d'apprentissage :** transformer le geste répété « ajouter un device » en une commande déclenchable, pour ne plus ré-expliquer la procédure à chaque fois.

**Contexte outil.** Une slash command est un playbook que tu déclenches avec `/nom`. Le format historique est un fichier `.md` sous `.claude/commands/` ; le format désormais recommandé est un skill sous `.claude/skills/<nom>/SKILL.md`, qui accepte la même invocation `/nom` **et** peut être invoqué automatiquement par Claude. Les deux marchent ; commence par le plus simple.

**À faire :**
1. Crée `.claude/commands/add-device.md` qui décrit ta procédure standard, avec un argument :
   ```markdown
   ---
   description: Add a new device and its controls to Home Hub, via the agent pipeline.
   argument-hint: [device-name]
   ---

   Add support for the device "$ARGUMENTS" to Home Hub.
   Follow this pipeline, pausing for my validation between each step:
   1. Use the architect subagent to design the data model, the API contract and the control actions for this device. Write the spec under docs/adr/.
   2. Use the backend subagent to implement the API from that spec, with unit tests.
   3. Use the frontend subagent to add the control UI in the Angular dashboard.
   Report a summary and wait for my approval before each subagent runs.
   ```
2. Utilise-la : `/add-device thermostat`. Observe qu'elle orchestre le pipeline, en s'arrêtant pour ta validation.

**Point de validation :** tu ajoutes un deuxième type de device via une seule commande, tout en validant chaque étape. ✅

**Ce que tu dois avoir compris :** un workflow qui marche mérite d'être figé dans une commande. C'est le passage de « je prompte à la main » à « j'ai un outil reproductible ».

---

# Module 7 — Hooks : des garde-fous déterministes

**Objectif d'apprentissage :** ajouter des règles *non négociables* qui s'exécutent automatiquement, indépendamment du jugement du modèle.

**Contexte outil.** Un hook est un script shell déclenché par un événement du cycle de vie de Claude Code (avant/après une écriture, avant une commande Bash, etc.). Contrairement à un prompt, il ne peut pas « halluciner » : il exécute du code déterministe. Cas d'usage typiques : formater le code après édition, lancer le lint/les types, **bloquer une commande dangereuse** avant exécution.

**À faire :**
1. Ajoute un hook `PostToolUse` (après édition de fichier) qui lance le formateur et le lint sur le projet. Objectif : le code produit par n'importe quel agent est toujours propre.
2. Ajoute un hook `PreToolUse` sur Bash qui **bloque** les commandes destructrices (ex. tout ce qui ressemble à `rm -rf`). Un hook qui renvoie le bon code de sortie refuse l'appel avant qu'il ne s'exécute. → C'est un filet de sécurité qui *complète* ta validation manuelle.
3. Teste : demande volontairement une action que le hook doit bloquer, et vérifie qu'elle est refusée.

**Point de validation :** une écriture d'agent déclenche automatiquement le lint ; une commande dangereuse est bloquée sans ton intervention. ✅

**Ce que tu dois avoir compris :** il y a deux niveaux de contrôle — ton **jugement** (validation manuelle) et des **règles automatiques** (hooks). Les agents opèrent à l'intérieur de ces garde-fous.

---

# Module 8 — L'agent Tester et l'orchestration en pipeline

**Objectif d'apprentissage :** compléter l'équipe avec un rôle de vérification, et assembler Architect → Backend → Frontend → Tester en un pipeline fiable où chaque agent a une « définition de terminé ».

**À faire :**
1. Crée `.claude/agents/tester.md`, en **lecture seule + exécution de tests** (par ex. `tools: Read, Bash, Grep, Glob` — pas de `Write`/`Edit` sur le code applicatif). Son rôle : lancer la suite de tests, vérifier que la feature respecte la spec de l'architecte, et **ne rapporter que les tests qui échouent** avec leur message d'erreur. C'est un usage idéal du sous-agent : la sortie verbeuse des tests reste dans son contexte, ta conversation ne reçoit que le résumé.
2. Fais évoluer ta commande `/add-device` pour ajouter une 4ᵉ étape : « Use the tester subagent to verify the feature against the spec; report only failures. »
3. Introduis une **définition de terminé** par agent (checklist en fin de prompt) : architect → spec + garde-fous ; backend → code + tests verts ; frontend → UI fonctionnelle ; tester → suite verte. Si un critère manque, on s'arrête et on corrige.

**Point de validation :** `/add-device <un nouveau device>` déroule les 4 rôles, s'arrête à chaque validation, et le tester confirme (ou infirme) que tout passe. ✅

**Ce que tu dois avoir compris :** une équipe d'agents = des rôles aux responsabilités séparées + des critères de fin clairs + un humain (toi) qui approuve les transitions. C'est ça, l'orchestration.

> **Note sur la taille de l'équipe :** en pratique, on plafonne souvent autour de 3–4 sous-agents utiles ; au-delà, ta propre charge de coordination augmente plus vite que le bénéfice. Architect / Backend / Frontend / Tester est un bon format cible. Introduis-les un par un, comme dans ce plan, plutôt que tous d'un coup.

---

# Module 9 — Déploiement sur Raspberry Pi

**Objectif d'apprentissage :** utiliser tes agents pour une tâche d'infra réelle, et voir leurs limites.

**À faire :**
1. Demande à l'architect un plan de déploiement adapté au Pi (contraintes ARM, mémoire, MongoDB sur ressources limitées, démarrage au boot).
2. Fais implémenter par le backend/un agent les scripts nécessaires (build de prod Angular servi par Node, configuration du service).
3. Valide chaque étape, déploie, teste sur le Pi réel.

**Point de validation :** Home Hub tourne sur le Raspberry Pi et tu y accèdes depuis un autre appareil du réseau. ✅

**Ce que tu dois avoir compris :** les agents accélèrent aussi l'infra, mais certaines étapes (accès physique, réseau local, matériel) restent à toi. Savoir *quand un agent est le bon outil et quand il ne l'est pas* fait partie de la maîtrise.

---

# Module 10 — Consolidation : ajouter tes vrais devices

**Objectif d'apprentissage :** ancrer l'ensemble en répétant le geste central sur tes appareils réels.

**À faire :**
- Pour chaque device réel que tu contrôlais via une app séparée, lance `/add-device <nom>` et déroule le pipeline complet, en validant.
- Tiens un court journal : pour chaque device, qu'est-ce qui a bien marché, où un agent a-t-il eu besoin de plus de contexte, quel garde-fou t'a sauvé.

**Point de validation :** ta page Home Hub rassemble et contrôle tes vrais appareils. Et surtout, tu sais **expliquer** pourquoi chaque agent, commande et hook existe. ✅

---

## Récapitulatif de progression

| Module | Compétence agentique acquise | Livrable app |
|---|---|---|
| 0 | Environnement + où vit la config | Repo initialisé |
| 1 | `CLAUDE.md`, validation par défaut | Cadre projet |
| 2 | Plan Mode, boucle plan→validation | Squelettes back + front |
| 3 | Créer un sous-agent, contexte isolé, lecture seule | Agent Architect + 1ʳᵉ spec |
| 4 | Passage de contexte, agent qui écrit | Agent Backend + API devices |
| 5 | Collaboration multi-agents | Agent Frontend + 1ʳᵉ verticale |
| 6 | Slash command / skill réutilisable | `/add-device` |
| 7 | Hooks, garde-fous déterministes | Lint auto + blocage dangereux |
| 8 | Orchestration en pipeline, définition de terminé | Agent Tester + pipeline complet |
| 9 | Agents sur une tâche d'infra | Déploiement Pi |
| 10 | Répétition et consolidation | App finale avec vrais devices |

---

## Deux conseils pour tout le parcours

1. **Commit après chaque point de validation.** C'est ce qui rend « garder la main » réel : tu peux toujours revenir à un état validé si un agent dérive.
2. **Quand un agent échoue, soupçonne d'abord le contexte, pas le modèle.** 9 fois sur 10, il lui manquait un chemin de fichier, une décision ou un message d'erreur dans la tâche que tu lui as passée.

*Note : Claude Code évolue vite (noms de commandes, format skills vs commands, événements de hooks). En cas de doute sur une syntaxe précise, `/help` dans ta session et la documentation officielle sont la source de vérité — demande à Claude Code lui-même, il sait consulter sa propre doc.*
