<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Huggy Studio

SaaS **Huggy** : studio IA (Claude en priorité, Gemini en secours), projets multi-fichiers persistés dans **PostgreSQL**, prévisualisation live et **déploiement statique** par slug (`/live/{slug}/` ou sous-domaine).

L’app **NEXUS** dans le cadre de preview est une **démo simulée** générée par Huggy.

## Variables d’environnement

Voir [.env.example](.env.example). Principales :

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | PostgreSQL (obligatoire pour projets / sauvegarde / déploiement) |
| `DATABASE_SSL` | Optionnel : force SSL si requis par l'hôte (sinon via `sslmode=require` dans l'URL) |
| `ANTHROPIC_API_KEY` | Claude (prioritaire pour `/api/generate-app`) |
| `ANTHROPIC_MODEL` | Optionnel (défaut : `claude-3-5-sonnet-20241022`) |
| `GEMINI_API_KEY` | Secours si pas de clé Anthropic |
| `PUBLIC_APP_URL` | URL publique du service (liens après « Publier ») |
| `SITES_DIR` | Dossier des builds utilisateur (défaut `./data/sites`, Docker : `/data/sites`) |
| `PREVIEW_ROOT_DOMAIN` | Ex. `previews.votredomaine.com` → `{slug}.previews...` sert le site |

**Auth** : volontairement absente pour l’instant — l’URL `?project={uuid}` fait office de « secret » (à durcir plus tard).

## PostgreSQL

Le serveur crée les tables au démarrage (`pgcrypto`, `projects`, `project_files`, `deployments`) dès que `DATABASE_URL` est défini.

### Option A — Docker (recommandé en local)

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS).

```bash
npm run db:up
```

Dans **`.env`** ou **`.env.local`** :

```env
DATABASE_URL=postgresql://huggy:huggy_local_dev@localhost:5432/huggy
```

*(Mot de passe volontairement simple **uniquement pour le dev local** ; ne pas réutiliser en production.)*

Commandes utiles : `npm run db:down`, `npm run db:logs`.

### Option B — Railway / autre hébergeur

Crée une base PostgreSQL, copie la variable `DATABASE_URL` (souvent avec `sslmode=require`) dans les variables d’environnement du service Node.

## Développement local

1. `npm run db:up` **ou** une `DATABASE_URL` pointant vers ta base
2. `npm install --include=dev`
3. `.env` / `.env.local` : `DATABASE_URL`, `ANTHROPIC_API_KEY` et/ou `GEMINI_API_KEY`
4. `npm run dev` → Vite **:3000** + API **:3001** (proxy `/api` et `/live`)
5. Vérifier `GET /api/health` → `"database": "connected"`

### Intégrer ta clé API Claude (sécurisé)

Ne mets jamais la clé dans le frontend ni dans une table PostgreSQL.

1. Ouvre `.env.local` (non versionné) :

```env
ANTHROPIC_API_KEY=ta_cle_claude
GEMINI_API_KEY=ta_cle_gemini_optionnelle
```

2. Garde la clé côté serveur uniquement (`server/index.mjs` + `server/lib/aiGenerate.mjs`).
3. Vérifie la santé:

```bash
curl http://localhost:3001/api/health
```

Tu dois voir `anthropic: true`.

### Connecter Supabase (PostgreSQL)

Utilise la chaîne de connexion PostgreSQL Supabase dans `DATABASE_URL`.
Recommandé en production: SSL actif (`sslmode=require`).

```env
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_SSL=true
DATABASE_SSL_INSECURE=false
```

`DATABASE_SSL_INSECURE` doit rester `false` (ou absent) sauf cas exceptionnel.

## Production (Railway)

1. Créer un service **PostgreSQL** et copier `DATABASE_URL` dans les variables du service **web**.
2. Déployer avec le **Dockerfile** (voir `railway.toml`).
3. Définir : `ANTHROPIC_API_KEY`, `PUBLIC_APP_URL` (URL Railway HTTPS), `NODE_ENV=production`.
4. **Volume** (recommandé) : monter un disque sur `/data` pour que les previews survivent aux redémarrages (`SITES_DIR=/data/sites`).

### Préviews sans wildcard DNS

URL type : `https://VOTRE_APP.railway.app/live/{slug}/`

### Préviews par sous-domaine

DNS wildcard `*.previews.votredomaine.com` → Railway, puis `PREVIEW_ROOT_DOMAIN=previews.votredomaine.com`.

## API utiles

- `GET /api/health` — DB + clés IA
- `POST /api/projects` — créer un projet (+ fichiers par défaut)
- `GET /api/projects/:id` — projet + fichiers + déploiements
- `PUT /api/projects/:id/files` — `{ "path", "content" }`
- `POST /api/projects/:id/deploy` — build esbuild + fichiers dans `SITES_DIR/{slug}`
- `POST /api/generate-app` — body `{ prompt, currentCode, projectId? }`

## AI Studio (héritage)

https://ai.studio/apps/d92dbab4-0e81-45a1-b1a1-1f564e14c338

## Limites actuelles

- Pas de **quotas** par utilisateur ni file d’attente de build.
- Déploiement **synchrone** sur la requête HTTP (timeout possible sur gros projets).
- Auth / multi-tenant sécurisé à ajouter.
