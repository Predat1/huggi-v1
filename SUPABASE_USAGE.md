# 📚 Utiliser Supabase dans Huggy V1

## Vue d'ensemble

Supabase est maintenant configuré pour Huggy V1 avec:
- ✅ Authentication (Supabase Auth)
- ✅ Database (PostgreSQL)
- ✅ Row Level Security (RLS)

---

## 1. Utiliser l'authentification

### Vérifier si l'utilisateur est connecté
```typescript
import { getAuthUser } from '@/lib/supabaseClient';

const user = await getAuthUser();
if (user) {
  console.log('Utilisateur connecté:', user.email);
} else {
  console.log('Utilisateur non connecté');
}
```

### S'inscrire
```typescript
import { signUp } from '@/lib/supabaseClient';

const { data, error } = await signUp('user@example.com', 'password123');
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Utilisateur créé');
}
```

### Se connecter
```typescript
import { signIn } from '@/lib/supabaseClient';

const { data, error } = await signIn('user@example.com', 'password123');
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Connecté');
}
```

### Se déconnecter
```typescript
import { signOut } from '@/lib/supabaseClient';

await signOut();
```

### Écouter les changements d'authentification
```typescript
import { onAuthStateChange } from '@/lib/supabaseClient';

const unsubscribe = onAuthStateChange((user) => {
  if (user) {
    console.log('Utilisateur connecté:', user.email);
  } else {
    console.log('Utilisateur déconnecté');
  }
});

// À appeler lors du cleanup
unsubscribe?.subscription?.unsubscribe();
```

---

## 2. Utiliser les projets

### Récupérer tous les projets de l'utilisateur
```typescript
import { getUserProjects } from '@/lib/supabaseService';

const { data: projects, error } = await getUserProjects();
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Projets:', projects);
}
```

### Créer un projet
```typescript
import { createProject } from '@/lib/supabaseService';

const { data: project, error } = await createProject(
  'Mon Application',
  'mon-app',
  'Une super application React'
);
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Projet créé:', project.id);
}
```

### Récupérer un projet spécifique
```typescript
import { getProject } from '@/lib/supabaseService';

const { data: project, error } = await getProject('project-uuid');
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Projet:', project.name);
}
```

### Mettre à jour un projet
```typescript
import { updateProject } from '@/lib/supabaseService';

const { data: project, error } = await updateProject('project-uuid', {
  name: 'Nouveau nom',
  description: 'Nouvelle description',
});
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Projet mis à jour');
}
```

### Supprimer un projet
```typescript
import { deleteProject } from '@/lib/supabaseService';

const { error } = await deleteProject('project-uuid');
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Projet supprimé');
}
```

---

## 3. Utiliser les fichiers de projet

### Récupérer tous les fichiers d'un projet
```typescript
import { getProjectFiles } from '@/lib/supabaseService';

const { data: files, error } = await getProjectFiles('project-uuid');
if (error) {
  console.error('Erreur:', error);
} else {
  files.forEach((file) => {
    console.log(`${file.path}: ${file.content.length} chars`);
  });
}
```

### Mettre à jour un fichier
```typescript
import { updateProjectFile } from '@/lib/supabaseService';

const { error } = await updateProjectFile(
  'project-uuid',
  'src/App.tsx',
  'export default function App() { return <div>Hello</div>; }'
);
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Fichier mis à jour');
}
```

### Supprimer un fichier
```typescript
import { deleteProjectFile } from '@/lib/supabaseService';

const { error } = await deleteProjectFile('project-uuid', 'src/App.tsx');
if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Fichier supprimé');
}
```

---

## 4. Exemple: Hook React pour les projets

```typescript
// hooks/useProjects.ts
import { useEffect, useState } from 'react';
import { getUserProjects, createProject } from '@/lib/supabaseService';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await getUserProjects();
      if (error) {
        setError(error);
      } else {
        setProjects(data);
      }
      setLoading(false);
    }

    loadProjects();
  }, []);

  const addProject = async (name: string, slug: string) => {
    const { data, error } = await createProject(name, slug);
    if (!error && data) {
      setProjects([...projects, data]);
    }
    return { data, error };
  };

  return { projects, loading, error, addProject };
}
```

### Utiliser le hook
```typescript
function ProjectsList() {
  const { projects, loading, error, addProject } = useProjects();

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
        </div>
      ))}
      <button onClick={() => addProject('Nouveau', 'nouveau')}>
        Créer un projet
      </button>
    </div>
  );
}
```

---

## 5. Row Level Security (RLS) - Important!

Tous les projets sont protégés par RLS. Cela signifie:
- ✅ Les utilisateurs ne voient que leurs propres projets
- ✅ Impossibilité d'accéder aux projets d'autres utilisateurs
- ✅ Suppression automatique des projets si l'utilisateur est supprimé

Les règles sont configurées automatiquement dans `SUPABASE_SETUP.md`.

---

## 6. Types TypeScript

```typescript
// Types pour les projets
interface Project {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les fichiers
interface ProjectFile {
  project_id: string;
  path: string;
  content: string;
  updated_at: string;
}
```

---

## 7. Déploiement sur Railway avec Supabase

### Variables d'env à ajouter sur Railway:
```
DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres?sslmode=require
```

### Variables Supabase (optionnel pour le frontend):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

Le backend utilisera automatiquement `DATABASE_URL` pour PostgreSQL.
Le frontend utilisera les variables `VITE_SUPABASE_*` si configurées.

---

## ✅ Checklist

- [ ] Créer compte Supabase
- [ ] Ajouter DATABASE_URL au .env
- [ ] Créer tables via SQL Editor
- [ ] Ajouter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY au .env.local
- [ ] Tester l'authentification
- [ ] Tester la création/lecture de projets
- [ ] Tester RLS (vérifier isolation entre utilisateurs)
- [ ] Déployer sur Railway avec DATABASE_URL

---

## 🆘 Troubleshooting

### "RLS policy violation"
→ L'utilisateur n'est pas autorisé. Vérifier qu'il est connecté.

### "Table does not exist"
→ Les tables SQL n'ont pas été créées. Voir SUPABASE_SETUP.md étape 7.

### "Permission denied for schema public"
→ L'anon key n'a pas les droits. Vérifier les permissions dans Supabase → Auth → Policies.

### "CORS error"
→ Ajouter la URL du frontend aux CORS settings dans Supabase.

---

**Prêt à utiliser Supabase?** 🎉
