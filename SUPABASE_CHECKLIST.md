# ✅ Supabase Setup Checklist

## Phase 1: Création du Compte & Projet

- [ ] Aller sur https://supabase.com
- [ ] Créer un compte avec email/GitHub
- [ ] Créer un nouveau projet
  - [ ] Donner un nom: `huggy-v1`
  - [ ] Choisir une région (près de toi)
  - [ ] Définir un mot de passe sécurisé
- [ ] Attendre que le projet soit prêt (1-2 minutes)

---

## Phase 2: Récupérer les Identifiants

- [ ] Aller dans **Settings** → **Database**
- [ ] Copier la **CONNECTION STRING (URI)**
  ```
  postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
  ```
- [ ] Aller dans **Settings** → **API**
- [ ] Copier le **Project URL** (VITE_SUPABASE_URL)
  ```
  https://[PROJECT].supabase.co
  ```
- [ ] Copier la **anon public key** (VITE_SUPABASE_ANON_KEY)

---

## Phase 3: Configuration Backend

- [ ] Éditer le fichier `.env` à la racine du projet
- [ ] Ajouter/remplacer `DATABASE_URL` avec ta connection string Supabase:
  ```env
  DATABASE_URL=postgresql://postgres:[TON_MOT_DE_PASSE]@db.[TON_PROJECT].supabase.co:5432/postgres?sslmode=require
  ```
- [ ] Remplacer `[TON_MOT_DE_PASSE]` et `[TON_PROJECT]` par tes vrais paramètres
- [ ] Sauvegarder le fichier

---

## Phase 4: Configuration Frontend

- [ ] Créer ou éditer le fichier `.env.local` à la racine (si ça n'existe pas, le créer)
- [ ] Ajouter tes variables Supabase:
  ```env
  VITE_SUPABASE_URL=https://[TON_PROJECT].supabase.co
  VITE_SUPABASE_ANON_KEY=[TA_ANON_KEY]
  VITE_API_URL=http://localhost:8080
  ```
- [ ] Sauvegarder le fichier

---

## Phase 5: Installation des Dépendances

- [ ] Ouvrir un terminal dans le dossier `huggi-v1`
- [ ] Installer Supabase JS:
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] Attendre que l'installation soit complète

---

## Phase 6: Créer le Schéma SQL

- [ ] Aller dans Supabase → **SQL Editor**
- [ ] Créer une nouvelle query
- [ ] Copier-coller **TOUT** le contenu de `SUPABASE_SCHEMA.sql`
- [ ] Cliquer **Run** (Ctrl+Enter)
- [ ] Attendre la confirmation (vert)
- [ ] Vérifier que les tables sont créées dans l'onglet **Tables**

---

## Phase 7: Tester la Connexion

- [ ] Lancer le développement:
  ```bash
  npm run dev
  ```
- [ ] Ouvrir http://localhost:3000 dans le navigateur
- [ ] Vérifier qu'aucune erreur de base de données apparaît
- [ ] Si erreur → Vérifier les logs du terminal (souvent un typo dans DATABASE_URL)

---

## Phase 8: Tester l'Authentification (Optionnel)

- [ ] Dans Supabase, aller à **Authentication** → **Users**
- [ ] Créer un utilisateur de test ou tester l'inscription via le site
- [ ] Vérifier que l'utilisateur apparaît dans la liste

---

## Phase 9: Vérifier les Données

- [ ] Dans Supabase, aller à **SQL Editor**
- [ ] Exécuter:
  ```sql
  SELECT * FROM user_profiles;
  SELECT * FROM projects;
  ```
- [ ] Voir les résultats (peuvent être vides au début)

---

## Phase 10: Dépôt Git

- [ ] Vérifier que `.env` contient un vrai DATABASE_URL (pas le placeholder)
- [ ] Vérifier que `.env.local` n'est PAS en git (doit être dans `.gitignore`)
- [ ] Lancer:
  ```bash
  git add .
  git commit -m "feat: add Supabase integration with auth and database"
  git push origin main
  ```

---

## Phase 11: Déploiement sur Railway

- [ ] Aller sur Railway: https://railway.app
- [ ] Créer un nouveau projet
- [ ] Connecter ton dépôt GitHub
- [ ] Ajouter les variables d'environnement:
  ```
  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
  ANTHROPIC_API_KEY=[TON_API_KEY]
  ```
- [ ] Déployer
- [ ] Vérifier que l'app fonctionne

---

## ✅ Vérifications Finales

### Backend
- [ ] `npm run dev` lance sans erreur
- [ ] Les logs montrent "Connected to database"
- [ ] Les routes API répondent

### Frontend
- [ ] Le site charge correctement
- [ ] Pas d'erreurs dans la console (F12)
- [ ] Supabase Client n'affiche pas de warning

### Database
- [ ] Les tables existent dans Supabase
- [ ] RLS est activé
- [ ] Les données sont isolées par utilisateur

---

## 🆘 Troubleshooting

### Error: "Cannot connect to database"
```
Cause: DATABASE_URL incorrect ou typo
Solution: Vérifier qu'il n'y a pas de typo, copier-coller depuis Supabase
```

### Error: "SSL required"
```
Cause: Supabase nécessite SSL (normal!)
Solution: S'assurer que `?sslmode=require` est dans la chaîne
```

### Error: "Supabase not configured"
```
Cause: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant
Solution: Ajouter les deux variables dans `.env.local`
```

### Error: "RLS policy violation"
```
Cause: L'utilisateur n'a pas les droits
Solution: Vérifier l'authentification ou les policies SQL
```

### Error: "Table does not exist"
```
Cause: Schéma SQL n'a pas été exécuté
Solution: Copier-coller SUPABASE_SCHEMA.sql dans SQL Editor et exécuter
```

---

## 📚 Fichiers Importants

| Fichier | Description |
|---------|-------------|
| `.env` | DATABASE_URL (backend) |
| `.env.local` | VITE_SUPABASE_* (frontend) |
| `src/lib/supabaseClient.ts` | Client Supabase |
| `src/lib/supabaseService.ts` | Services pour les données |
| `SUPABASE_SCHEMA.sql` | SQL pour créer les tables |
| `SUPABASE_SETUP.md` | Guide détaillé |
| `SUPABASE_USAGE.md` | Exemples d'utilisation |

---

## 🎯 État Courant

- [ ] Étape 1-10: Configuration initiale
- [ ] Étape 11: Déploiement
- [ ] Étape 12: Production

---

**Status: 🟢 Prêt pour Supabase!**

Commence par l'étape 1 et suis chaque point. Si tu bloques, consulte la section "Troubleshooting".
