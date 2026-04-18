# 🚀 Supabase Integration - Huggy V1

## ✨ Ce qui a été ajouté

Supabase est maintenant **entièrement intégré** à Huggy V1 avec:

✅ **Backend PostgreSQL** - Via `DATABASE_URL`  
✅ **Frontend Supabase Client** - Via `src/lib/supabaseClient.ts`  
✅ **Services de Données** - Via `src/lib/supabaseService.ts`  
✅ **Authentification** - Supabase Auth  
✅ **Row Level Security** - Pour l'isolationde données  
✅ **Composants React** - `SupabaseAuth.tsx`

---

## 📁 Fichiers Créés

| Fichier | Type | Description |
|---------|------|-------------|
| `src/lib/supabaseClient.ts` | Code | Client Supabase + Auth helpers |
| `src/lib/supabaseService.ts` | Code | Services pour les données (projects, files) |
| `src/components/SupabaseAuth.tsx` | Code | Composants Auth UI (form, status) |
| `package.json` | Config | Ajout @supabase/supabase-js |
| `.env.local.example` | Config | Template pour variables frontend |
| `SUPABASE_SETUP.md` | Doc | Guide complet de setup (8 étapes) |
| `SUPABASE_USAGE.md` | Doc | Exemples d'utilisation avec code |
| `SUPABASE_CHECKLIST.md` | Doc | Checklist complète avec 11 phases |
| `SUPABASE_SCHEMA.sql` | SQL | Schéma complet + RLS + Triggers |
| `install-supabase.sh` | Script | Script installation automatique |

---

## 🚀 Quick Start (5 minutes)

### 1️⃣ Créer un compte Supabase
```bash
# Va sur https://supabase.com et crée un compte gratuit
# Crée un nouveau projet
```

### 2️⃣ Copier la CONNECTION STRING
```
Settings → Database → Connection string → URI
```

### 3️⃣ Configurer .env
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```

### 4️⃣ Configurer .env.local
```env
VITE_SUPABASE_URL=https://[PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[TA_ANON_KEY]
VITE_API_URL=http://localhost:8080
```

### 5️⃣ Créer les tables
```
Supabase → SQL Editor → Copier SUPABASE_SCHEMA.sql → Run
```

### 6️⃣ Lancer l'app
```bash
npm run dev
```

**Voilà!** Ton app est connectée à Supabase! 🎉

---

## 📚 Documentation

### Setup Complet
👉 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**
- Crée compte et projet (étape 1-2)
- Connection string (étape 3)
- Client frontend (étape 5-6)
- Tables SQL (étape 7)
- Tester la connexion (étape 8)

### Utilisation dans le Code
👉 **[SUPABASE_USAGE.md](./SUPABASE_USAGE.md)**
- Auth: Sign in, Sign up, Sign out
- Projets: CRUD complet
- Fichiers: Read, write, delete
- Hooks React
- Types TypeScript
- Déploiement

### Checklist Step-by-Step
👉 **[SUPABASE_CHECKLIST.md](./SUPABASE_CHECKLIST.md)**
- 11 phases avec checkboxes
- Vérifications finales
- Troubleshooting complet
- Dépôt Git
- Déploiement Railway

### Schéma SQL
👉 **[SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql)**
- Tables: user_profiles, projects, project_files, deployments
- Indexes pour la performance
- Row Level Security (RLS)
- Triggers pour l'auto-création de profil
- Views et grants

---

## 💻 Utilisation Rapide

### Authentification
```typescript
import { signUp, signIn, signOut, getAuthUser } from '@/lib/supabaseClient';

// S'inscrire
await signUp('user@example.com', 'password');

// Se connecter
await signIn('user@example.com', 'password');

// Vérifier l'utilisateur
const user = await getAuthUser();

// Se déconnecter
await signOut();
```

### Récupérer les Projets
```typescript
import { getUserProjects } from '@/lib/supabaseService';

const { data: projects, error } = await getUserProjects();
```

### Créer un Projet
```typescript
import { createProject } from '@/lib/supabaseService';

const { data: project, error } = await createProject(
  'Mon App',
  'mon-app',
  'Description optionnelle'
);
```

### Composant Auth UI
```typescript
import { AuthForm, AuthStatus } from '@/components/SupabaseAuth';

// Formulaire d'authentification
<AuthForm onSuccess={() => location.reload()} />

// Statut utilisateur
<AuthStatus user={user} onSignOut={handleSignOut} />
```

---

## 🔐 Sécurité - Row Level Security

Toutes les tables sont protégées par **RLS (Row Level Security)**:

✅ Les utilisateurs ne voient que leurs propres données  
✅ Impossible d'accéder aux données des autres  
✅ Suppression en cascade si l'utilisateur est supprimé  

Exemple: Un utilisateur ne peut accéder qu'à ses projets:
```sql
-- Politique automatique
WHERE user_id = auth.uid()
```

---

## 🧪 Tester en Local

```bash
# 1. Configurer .env avec DATABASE_URL Supabase
# 2. Configurer .env.local avec VITE_SUPABASE_*
# 3. Créer les tables SQL dans Supabase

# 4. Lancer l'app
npm run dev

# 5. Ouvrir http://localhost:3000
# 6. Tester l'inscription/connexion
# 7. Créer un projet
# 8. Consulter les données dans Supabase Dashboard
```

---

## 🚀 Déployer sur Railway

### 1️⃣ Ajouter DATABASE_URL
```
Railway Dashboard → Variables → DATABASE_URL
postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```

### 2️⃣ Ajouter les variables AI (optionnel)
```
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

### 3️⃣ Déployer
```bash
git push  # Railway déploie automatiquement
```

---

## ✅ Vérifications

### Backend
- [ ] Logs montrent "Connected to database"
- [ ] Routes API répondent
- [ ] Données sauvegardées dans Supabase

### Frontend
- [ ] Pas d'erreurs console (F12)
- [ ] Supabase Client ne lance pas d'avertissement
- [ ] Authentification fonctionne

### Database
- [ ] Tables existent dans Supabase
- [ ] RLS est activé
- [ ] Données isolées par utilisateur

---

## 🆘 Troubleshooting

### "Cannot connect to database"
→ Vérifier DATABASE_URL dans .env (typo ou format incorrect)

### "Supabase not configured"
→ Ajouter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local

### "SSL required"
→ Supabase nécessite SSL (normal!) - Vérifier que `?sslmode=require` est dans la string

### "RLS policy violation"
→ L'utilisateur n'est pas connecté ou n'a pas les droits

### "Table does not exist"
→ Exécuter SUPABASE_SCHEMA.sql dans SQL Editor Supabase

---

## 📚 Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + Vite |
| Supabase Client | @supabase/supabase-js |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Sécurité | Row Level Security (RLS) |

---

## 🎯 Prochaines Étapes

1. **Suivre [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Setup complet
2. **Créer un compte Supabase** - Gratuit et rapide
3. **Configurer .env et .env.local**
4. **Exécuter SUPABASE_SCHEMA.sql**
5. **Tester en local avec `npm run dev`**
6. **Deployer sur Railway**

---

## 📞 Support

- 📖 Consulte [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) pour une aide
- 💻 Voir [SUPABASE_USAGE.md](./SUPABASE_USAGE.md) pour des exemples de code
- ✅ Suivre [SUPABASE_CHECKLIST.md](./SUPABASE_CHECKLIST.md) étape par étape

---

## 🎉 Status

✅ **Supabase est prêt!**

- ✅ Client Supabase installé
- ✅ Services de données créés
- ✅ Composants Auth créés
- ✅ Schéma SQL prêt
- ✅ Documentation complète
- ✅ Exemples de code

**Tu peux maintenant démarrer l'intégration Supabase!** 🚀

---

## 📌 Fichiers Clés

```
src/
├── lib/
│   ├── supabaseClient.ts    ← Client Supabase + Auth
│   └── supabaseService.ts   ← Services (CRUD)
├── components/
│   └── SupabaseAuth.tsx     ← Composants Auth
│
Root/
├── SUPABASE_SETUP.md        ← Guide setup (7 étapes)
├── SUPABASE_USAGE.md        ← Exemples d'utilisation
├── SUPABASE_CHECKLIST.md    ← Checklist (11 phases)
├── SUPABASE_SCHEMA.sql      ← Schéma SQL complet
├── .env                     ← DATABASE_URL (secret!)
└── .env.local               ← VITE_SUPABASE_* (frontend)
```

---

**Ready? Let's go!** 🚀✨
