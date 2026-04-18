# 🚀 Supabase Setup Guide - Huggy V1

## Étape 1: Créer un compte Supabase (Gratuit)

### 1.1 Aller sur Supabase
- Ouvre https://supabase.com
- Clique sur "Start your project" ou "Sign Up"
- Utilise ton email ou GitHub pour créer un compte

### 1.2 Créer un nouveau projet
- Clique sur "New project"
- Donne-lui un nom: `huggy-v1` (ou ce que tu préfères)
- Choisis une région proche de toi (ex: Europe si tu es en Europe)
- Définis un mot de passe de base de données (sécurisé!)
- Clique "Create new project" et attends 1-2 minutes

---

## Étape 2: Récupérer la Connection String

### 2.1 Accéder aux paramètres
Une fois le projet créé:
1. Va à **Settings** (en bas à gauche du sidebar)
2. Clique sur **Database**
3. Tu verras la section "Connection string"

### 2.2 Copier la CONNECTION STRING
Tu verras 3 onglets: **URI**, **Psql**, **Connection pooler**

**Choisis URI** (plus simple):
```
postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres?sslmode=require
```

✅ **Copie cette string complète** - tu la besoin dans la prochaine étape!

---

## Étape 3: Ajouter à ton .env

Va dans le dossier `huggi-v1` et édite le fichier `.env`:

```env
# --- PostgreSQL (Supabase) ---
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres?sslmode=require

# --- IA ---
ANTHROPIC_API_KEY=sk-ant-... (ton API Claude)
GEMINI_API_KEY=... (ton API Gemini si besoin)

# --- App ---
PORT=8080
PUBLIC_APP_URL=http://localhost:3000
SITES_DIR=./data/sites
```

**Remplace `[YOUR_PASSWORD]` et `[YOUR_PROJECT]` par tes vrais paramètres!**

---

## Étape 4: Installer Supabase Client (Frontend)

Dans le terminal:
```bash
cd huggi-v1
npm install @supabase/supabase-js
```

---

## Étape 5: Créer le Supabase Client

Crée un nouveau fichier `src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## Étape 6: Ajouter les clés au .env.local (Frontend)

Crée ou édite `.env.local` à la racine:

```env
VITE_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  (copie depuis Settings → API → anon public key)
VITE_API_URL=http://localhost:8080
```

### Comment trouver les clés:
1. Dans Supabase: **Settings** → **API**
2. Tu verras `Project URL` et `anon public key`
3. Copie-les dans `.env.local`

---

## Étape 7: Tables Supabase (SQL)

Va dans Supabase → **SQL Editor** et exécute:

```sql
-- Users (Supabase gère auth, mais tu peux créer une table profil)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

-- Projects (déjà créé par le backend, mais on peut l'enrichir)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Sans titre',
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs voient seulement leurs projets
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);
```

---

## Étape 8: Tester la connexion

Dans le terminal:
```bash
npm run dev
```

Le backend devrait se connecter à Supabase automatiquement. Tu verras:
```
✅ Connected to database
```

Visite http://localhost:3000 et la app devrait fonctionner!

---

## ✅ Checklist

- [ ] Compte Supabase créé
- [ ] Projet créé et connection string copiée
- [ ] `.env` configuré avec DATABASE_URL
- [ ] `npm install @supabase/supabase-js` done
- [ ] `src/lib/supabaseClient.ts` créé
- [ ] `.env.local` avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
- [ ] Tables SQL créées via SQL Editor
- [ ] `npm run dev` fonctionne
- [ ] Projet poussé sur GitHub

---

## 🆘 Troubleshooting

### Error: "Cannot connect to database"
→ Vérifier que DATABASE_URL dans .env est correct (sans typos)

### Error: "SSL required"
→ Supabase nécessite SSL (c'est dans la string avec `?sslmode=require`)

### Error: "Supabase not configured"
→ Ajouter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans `.env.local`

### Error: "Permission denied"
→ Vérifier que Row Level Security (RLS) est bien configurée dans Supabase

---

## 📚 Ressources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Guide](https://www.postgresql.org/docs/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

**Prêt? Commence par l'étape 1!** 🚀
