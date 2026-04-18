# Amélioration UX - Navigation Fluide

Ce document explique comment intégrer les nouveaux composants d'amélioration UX dans votre application Huggy.

## Composants disponibles

### 1. NavigationBar
Navigation principale de l'application avec support mobile et animations fluides.

```tsx
import { NavigationBar } from '@/components/NavigationBar';

<NavigationBar
  onOpenStudio={() => console.log('Studio ouvert')}
  onSettings={() => console.log('Settings')}
  onHelp={() => console.log('Help')}
  onLogout={() => console.log('Logout')}
  isStudioMode={false}
/>
```

### 2. PageTransition
Transitions fluides entre les pages avec plusieurs effets.

```tsx
import { PageTransition } from '@/components/PageTransition';

<PageTransition type="slideUp">
  <YourPageComponent />
</PageTransition>
```

Types disponibles: `fade`, `slideUp`, `slideDown`, `slideLeft`, `slideRight`

### 3. Toast System
Système de notifications fluide avec animations.

```tsx
import { useToast, ToastContainer } from '@/components/Toast';

const { toasts, addToast, removeToast } = useToast();

// Dans votre JSX
<ToastContainer toasts={toasts} onRemove={removeToast} />

// Utilisation
addToast('Succès !', 'success');
addToast('Erreur !', 'error');
addToast('Chargement...', 'loading');
addToast('Information', 'info');
```

### 4. Loader
Composants de chargement avec animations fluides.

```tsx
import { Loader, PageLoader, Skeleton } from '@/components/Loader';

// Loader simple
<Loader size="md" text="Chargement..." />

// Minimal
<Loader variant="minimal" />

// Page loader (fullscreen)
<PageLoader />

// Skeleton loaders
<Skeleton className="h-10 w-full" count={3} />
```

### 5. StudioNavigation
Composants de navigation pour l'éditeur du studio.

```tsx
import { BreadcrumbNav, TabNavigation, Sidebar } from '@/components/StudioNavigation';

// Breadcrumbs
<BreadcrumbNav
  items={[
    { label: 'Projets', onClick: () => {} },
    { label: 'Mon App', onClick: () => {} }
  ]}
  onAdd={() => console.log('Ajouter')}
/>

// Tabs
<TabNavigation
  tabs={[
    { id: 'chat', label: 'Chat', icon: <MessageSquare /> },
    { id: 'code', label: 'Code', icon: <Code /> }
  ]}
  activeTabId="chat"
  onTabChange={(id) => console.log(id)}
/>

// Sidebar
<Sidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  title="Paramètres"
>
  {/* Contenu */}
</Sidebar>
```

## Points clés pour l'intégration

1. **App.tsx** : Remplacez la structure existante par `NavigationBar` + `PageTransition`
2. **Gestion d'état** : Utilisez `useToast` pour les notifications
3. **Animations** : Les transitions utilisent `motion/react` (déjà installé)
4. **Responsive** : Tous les composants sont mobile-first

## Prochaines étapes

1. Intégrer `NavigationBar` dans l'en-tête du studio
2. Ajouter `PageTransition` aux changements de page
3. Remplacer les `showToast` existants par `useToast`
4. Tester sur mobile et desktop

## Styles Tailwind personnalisés

Les composants utilisent les classes Tailwind par défaut. Pour personnaliser les couleurs :

- Modifiez les classes `bg-blue-600`, `text-slate-900`, etc.
- Utilisez votre palette de couleurs personnalisée dans `tailwind.config.ts`
