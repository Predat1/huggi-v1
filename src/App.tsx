import React, { useState, useRef, useEffect } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { 
  Zap, 
  ChevronDown, 
  Box, 
  Layout, 
  Download, 
  Plus, 
  Eye, 
  Mic, 
  MessageSquare, 
  ArrowUp, 
  Monitor, 
  Smartphone, 
  Tablet as TabletIcon,
  Cloud,
  Palette,
  BarChart3,
  MoreHorizontal,
  Database,
  Shield,
  HardDrive,
  Terminal as TerminalIcon,
  Code2,
  Undo,
  Redo,
  Maximize2,
  RotateCcw,
  RotateCw,
  ExternalLink,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Folder,
  Search,
  Check,
  Loader2,
  Settings,
  Save,
  History,
  FileCode,
  RefreshCw,
  ClipboardList,
  Copy,
  FolderOpen,
  Users,
  Sparkles,
  Home,
  Globe,
  Github,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SandpackProvider, SandpackLayout, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import * as LucideIcons from 'lucide-react';
import { DEFAULT_PREVIEW_CODE } from './defaultPreviewCode';
import { generateAppUpdate, getMe, requestAutoCorrection } from './services/geminiService';
import { streamChatText } from './utils/streamChatText';
import LandingPage from './components/LandingPage';
import UserDashboard from './components/UserDashboard';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getAuthUser, onAuthStateChange, signIn, signUp, signOut } from './lib/supabaseClient';
import { FullAppStream, StreamEvent, DebugFixStream } from './components/streaming';
import { StreamController, streamAgenticGeneration } from './services/streamingService';
import { SettingsModal } from './components/SettingsModal';
import { useCollaboration } from './hooks/useCollaboration';
import { useVersions } from './hooks/useVersions';
import { GithubExportModal } from './components/GithubExportModal';
import { SecretsModal } from './components/SecretsModal';
import HuggyChatInput from './components/HuggyChatInput';
import OnboardingModal from './components/OnboardingModal';
import TemplatesModal from './components/TemplatesModal';
import PricingSection from './components/PricingSection';
import AuthModal from './components/AuthModal';
import { ProjectAnalytics } from './components/ProjectAnalytics';
import { DatabaseInterface } from './components/DatabaseInterface';

type Message = {
  id: string;
  sender: 'VOUS' | 'HUGGY';
  text: string;
  timestamp: Date;
  changedFiles?: { path: string; original: string; current: string }[];
  durationMs?: number;
};

type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type TerminalTheme = 'default' | 'dark' | 'matrix' | 'ocean';
type SidebarTab = 'chat' | 'history';

interface TerminalTab {
  id: string;
  name: string;
  lines: string[];
}

interface AgentTask {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  type: 'read' | 'edit' | 'install' | 'compile' | 'lint' | 'search';
}

const TERMINAL_THEMES: Record<TerminalTheme, { bg: string; text: string; prompt: string; border: string; accent: string }> = {
  default: { bg: 'bg-white', text: 'text-slate-600', prompt: 'text-blue-600', border: 'border-slate-200', accent: 'bg-slate-50/50' },
  dark: { bg: 'bg-zinc-900', text: 'text-zinc-300', prompt: 'text-emerald-500', border: 'border-zinc-800', accent: 'bg-zinc-800/50' },
  matrix: { bg: 'bg-black', text: 'text-green-500', prompt: 'text-green-400', border: 'border-green-900/30', accent: 'bg-green-900/10' },
  ocean: { bg: 'bg-[#0f172a]', text: 'text-blue-200', prompt: 'text-cyan-400', border: 'border-blue-900/30', accent: 'bg-blue-900/20' },
};

const SandpackErrorListener = ({ onError }: { onError?: (err: string) => void }) => {
  const { sandpack } = useSandpack();
  const { status, error } = sandpack;
  
  React.useEffect(() => {
    if (status === 'idle' || status === 'done') {
      if (error && error.message && onError) {
        onError(error.message);
      }
    }
  }, [error, status, onError]);
  
  return null;
};

const PreviewContent = ({ mode, filesMap, onCodeError }: { mode: PreviewMode; filesMap: Record<string, string>, onCodeError?: (err: string) => void }) => {
  const isMobile = mode === 'mobile';
  const isTablet = mode === 'tablet';

  const sandpackFiles = Object.keys(filesMap).reduce((acc, key) => {
    const formattedKey = key.startsWith('/') ? key : `/${key}`;
    acc[formattedKey] = filesMap[key];
    return acc;
  }, {} as Record<string, string>);

  sandpackFiles["/index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root {
        --huggy-primary: #2563EB;
        --huggy-primary-hover: #1D4ED8;
        --huggy-primary-light: #DBEAFE;
        --huggy-secondary: #10B981;
        --huggy-accent: #8B5CF6;
        --huggy-bg: #F8F9FB;
        --huggy-bg-card: #FFFFFF;
        --huggy-text: #0F172A;
        --huggy-text-secondary: #64748B;
      }
      body { font-family: 'Inter', sans-serif; background: var(--huggy-bg); color: var(--huggy-text); }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  return (
    <div className={`w-full h-full bg-slate-50 flex flex-col overflow-hidden relative ${mode !== 'desktop' ? 'items-center justify-center p-4 sm:p-8' : ''}`}>
      <div 
        className={`h-full bg-white transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isMobile ? 'w-[375px] rounded-[2rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden shrink-0' :
          isTablet ? 'w-[768px] rounded-[1.5rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden shrink-0' :
          'w-full'
        }`}
      >
        <SandpackProvider 
          template="react-ts"
          theme="light"
          files={sandpackFiles}
          customSetup={{
            dependencies: {
              "lucide-react": "latest",
              "motion": "latest",
              "framer-motion": "latest",
              "clsx": "latest",
              "tailwind-merge": "latest"
            }
          }}
        >
          <SandpackLayout style={{ height: "100%", width: "100%", border: "none" }}>
            <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={true} style={{ height: "100%" }} />
            <SandpackErrorListener onError={onCodeError} />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
};

const INITIAL_MESSAGES: Message[] = [];

const PREVIEW_ENTRY = 'src/App.tsx';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('chat');
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'code'>('terminal');
  const editorRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [pendingCreditCost, setPendingCreditCost] = useState<number | null>(null);
  const [lastExport, setLastExport] = useState<any>(null);
  const [schemaSuggestion, setSchemaSuggestion] = useState<{ sql: string; tables: string[]; applying: boolean } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSecretsModal, setShowSecretsModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const isAutoCorrectingRef = useRef(false);

  const handleAutoCorrection = async (errorMessage: string) => {
    if (isAutoCorrectingRef.current || !user || !projectId) return;
    isAutoCorrectingRef.current = true;
    
    updateTerminalLines([`[SYSTEM] Erreur détectée dans la preview: ${errorMessage.substring(0, 50)}...`, `[SYSTEM] Lancement de l'auto-correction IA...`]);
    
    try {
      setDebugPrompt(`L'application a rencontré une erreur lors de l'exécution ou de la prévisualisation : ${errorMessage}. Analyse le code et corrige les fichiers nécessaires pour résoudre ce problème.`);
      setShowDebugStream(true);
    } catch (e) {
      console.error("Auto-correction échouée:", e);
      updateTerminalLines([`[SYSTEM] L'auto-correction a échoué.`]);
    } finally {
      setTimeout(() => { isAutoCorrectingRef.current = false; }, 10000);
    }
  };

  const streamControllerRef = useRef<StreamController | null>(null);
  useEffect(() => {
    streamControllerRef.current = new StreamController();
  }, []);

  useEffect(() => {
    getAuthUser().then(u => {
      setUser(u);
      if (u) {
        getMe({ userId: u.id, email: u.email }).then(data => setCredits(data.credits));
      }
    });
    const { data: { subscription } } = onAuthStateChange((u) => {
      setUser(u);
      if (u) {
        getMe({ userId: u.id, email: u.email }).then(data => setCredits(data.credits));
        // Show onboarding on first login ever
        if (!localStorage.getItem('huggy_onboarded')) {
          setShowOnboarding(true);
          localStorage.setItem('huggy_onboarded', '1');
        }
        // If there was a pending prompt, trigger studio
        if (pendingPrompt) {
          setStudioMode(true);
          setInputValue(pendingPrompt);
          setPendingPrompt(null);
        }
      } else {
        setCredits(null);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'redo', null);
      editorRef.current.focus();
    }
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'undo', null);
      editorRef.current.focus();
    }
  };

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5000); // 5 seconds
  const [isSaving, setIsSaving] = useState(false);
  const [showAutoSaveSettings, setShowAutoSaveSettings] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Nouveau Projet');
  const [databaseEnabled, setDatabaseEnabled] = useState(false);
  // Landing par défaut : si aucun `?project=` n'est présent, on affiche une page marketing.
  const [studioMode, setStudioMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    return Boolean(params.get('project')) || params.get('studio') === '1' || path.includes('/studio');
  });
  const [filesMap, setFilesMap] = useState<Record<string, string>>(() => ({
    [PREVIEW_ENTRY]: DEFAULT_PREVIEW_CODE,
  }));
  const [activeFilePath, setActiveFilePath] = useState(PREVIEW_ENTRY);
  const [editorLanguage, setEditorLanguage] = useState('typescript');
  const [editorTheme, setEditorTheme] = useState('vs-light');
  const [showMinimap, setShowMinimap] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<{id: string, url: string, date: Date}[]>([]);

  // SaaS UI States
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeAccentColor, setActiveAccentColor] = useState<'blue' | 'purple' | 'emerald' | 'rose'>('blue');
  const [showCloudMenu, setShowCloudMenu] = useState(false);
  const [showDesignMenu, setShowDesignMenu] = useState(false);
  const [showAnalyticsMenu, setShowAnalyticsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMagicMode, setIsMagicMode] = useState(true);
  const [showMagicStream, setShowMagicStream] = useState(false);
  const [showDebugStream, setShowDebugStream] = useState(false);
  const [debugPrompt, setDebugPrompt] = useState("");
  const [activeStudioTab, setActiveStudioTab] = useState<'preview' | 'code' | 'database' | 'analytics'>('preview');
  const [collabStreamEvents, setCollabStreamEvents] = useState<StreamEvent[]>([]);
  const [isSpectating, setIsSpectating] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await fetch('/api/health').then((r) => r.json());
        if (cancelled) return;
        setDatabaseEnabled(h.database === 'connected');

        const params = new URLSearchParams(window.location.search);
        const pid = params.get('project');
        if (pid) {
          if (h.database !== 'connected') return;
          const res = await fetch(`/api/projects/${pid}`);
          if (res.status === 404) {
            // L'URL pointe vers un projet supprimé/inexistant : recréer un projet pour rendre
            // le Studio utilisable et éviter que "Publier" ne fasse rien.
            const created = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Nouveau projet' }),
            }).then((r) => r.json());
            if (cancelled) return;
            setProjectId(created.project.id);
            setProjectName(created.project.name || 'Nouveau Projet');
            const map: Record<string, string> = {};
            for (const f of created.files) map[f.path] = f.content;
            setFilesMap(map);
            setActiveFilePath(PREVIEW_ENTRY);
            setDeployments([]);
            window.history.replaceState({}, '', `?project=${created.project.id}`);
            showToast('Projet introuvable : nouveau projet créé', 'info');
            return;
          }
          if (!res.ok) throw new Error('load');
          const data = await res.json();
          if (cancelled) return;
          const map: Record<string, string> = {};
          for (const f of data.files) {
            map[f.path] = f.content;
          }
          setProjectId(pid);
          setProjectName(data.project?.name || 'Nouveau Projet');
          setFilesMap(map);
          setActiveFilePath(PREVIEW_ENTRY);
          
          // Agent Memory: Restore chat history
          if (map['.huggy/history.json']) {
            try {
              const history = JSON.parse(map['.huggy/history.json']);
              const parsedMessages = history.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }));
              if (parsedMessages.length > 0) setMessages(parsedMessages);
            } catch (e) { console.error('Failed to parse history', e); }
          }

          if (data.deployments?.length) {
            setDeployments(
              data.deployments.map(
                (d: { id: string; slug: string; created_at: string }) => ({
                  id: d.id,
                  url: `${window.location.origin}/live/${d.slug}/`,
                  date: new Date(d.created_at),
                }),
              ),
            );
          }
          return;
        }

        // Pas de `?project=` : on ne crée rien automatiquement tant que l'utilisateur n'a pas ouvert le Studio.
        if (!studioMode) return;
        if (h.database !== 'connected') return;

        const created = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Nouveau projet' }),
        }).then((r) => r.json());
        if (cancelled) return;
        setProjectId(created.project.id);
        setProjectName(created.project.name || 'Nouveau Projet');
        const map: Record<string, string> = {};
        for (const f of created.files) map[f.path] = f.content;
        setFilesMap(map);
        setActiveFilePath(PREVIEW_ENTRY);
        window.history.replaceState(
          {},
          '',
          `?project=${created.project.id}`,
        );
      } catch {
        if (!cancelled) showToast('Mode local : sans PostgreSQL', 'info');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studioMode]);

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const streamCancelRef = useRef<(() => void) | null>(null);

  // Auto-send prompt from landing page
  useEffect(() => {
    if (studioMode && inputValue && messages.length === 0 && !isGenerating && user) {
      const t = setTimeout(() => {
        handleSendMessage(inputValue);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [studioMode, inputValue, messages.length, isGenerating, user]); // Trigger when studio opens or user loads


  useEffect(() => {
    if (!projectId || !databaseEnabled) return;
    const path = activeFilePath;
    const content = filesMap[path];
    if (content === undefined) return;
    const t = setTimeout(() => {
      fetch(`/api/projects/${projectId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })
        .then(() => {
          setLastSaved(new Date());
          broadcastFileUpdate(path, content);
        })
        .catch(() => showToast('Sauvegarde échouée', 'info'));
    }, 900);
    return () => clearTimeout(t);
  }, [filesMap, activeFilePath, projectId, databaseEnabled]);

  // Agent Memory: Persist chat history (trimmed to last 60 to avoid bloat)
  useEffect(() => {
    if (!projectId || !databaseEnabled || messages.length === 0) return;
    const t = setTimeout(() => {
      const trimmed = messages.slice(-60);
      fetch(`/api/projects/${projectId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '.huggy/history.json',
          content: JSON.stringify(trimmed, null, 2),
        }),
      }).catch(e => console.error('Failed to sync history:', e));
    }, 2000);
    return () => clearTimeout(t);
  }, [messages, projectId, databaseEnabled]);

  useEffect(() => {
    if (activeSidebarTab === 'history') loadVersions();
  }, [activeSidebarTab, projectId]);

  const openProjectFile = (path: string) => {
    if (path === activeFilePath) return;
    setActiveFilePath(path);
  };

  const addProjectFile = () => {
    const p = window.prompt('Chemin du fichier (ex. src/Utils.tsx)', 'src/Utils.tsx');
    if (!p || filesMap[p]) return;
    setFilesMap((f) => ({
      ...f,
      [p]: `import React from 'react';\n\nexport function Utils() {\n  return <div className="p-2 text-sm">Nouveau module</div>;\n}\n`,
    }));
    setActiveFilePath(p);
  };

  const handleNewProject = () => {
    if (
      !window.confirm(
        'Nouveau projet ? Le non sauvegardé restera dans l’URL actuelle si vous annulez.',
      )
    )
      return;
    setShowProjectMenu(false);
    if (!databaseEnabled) {
      setMessages(INITIAL_MESSAGES);
      setAgentTasks([]);
      setFilesMap({ [PREVIEW_ENTRY]: DEFAULT_PREVIEW_CODE });
      setActiveFilePath(PREVIEW_ENTRY);
      setDeployments([]);
      setLastSaved(null);
      showToast('Projet réinitialisé (sans base)', 'success');
      return;
    }
    (async () => {
      try {
        const created = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Nouveau projet' }),
        }).then((r) => r.json());
        setProjectId(created.project.id);
        setProjectName(created.project.name || 'Nouveau Projet');
        const map: Record<string, string> = {};
        for (const f of created.files) map[f.path] = f.content;
        setFilesMap(map);
        setActiveFilePath(PREVIEW_ENTRY);
        setMessages(INITIAL_MESSAGES);
        setAgentTasks([]);
        setDeployments([]);
        setLastSaved(null);
        window.history.replaceState(
          {},
          '',
          `?project=${created.project.id}`,
        );
        showToast('Nouveau projet créé', 'success');
      } catch {
        showToast('Impossible de créer le projet', 'info');
      }
    })();
  };

  const handlePublish = () => {
    if (!projectId || !databaseEnabled) {
      showToast('PostgreSQL requis pour publier', 'info');
      return;
    }
    setIsPublishing(true);
    setPublishProgress(5);
    setPublishedUrl(null);

    // Smooth progress animation — fills to 88% during the build, then jumps to 100%
    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      currentProgress += (88 - currentProgress) * 0.12;
      setPublishProgress(Math.round(currentProgress));
    }, 250);

    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/deploy`, {
          method: 'POST',
        });
        const data = await res.json();
        clearInterval(progressInterval);
        if (!res.ok) throw new Error(data.error || res.statusText);
        setPublishProgress(100);
        setPublishedUrl(data.url);
        setDeployments((prev) => [
          { id: data.deploymentId, url: data.url, date: new Date() },
          ...prev,
        ]);
        showToast('Déploiement terminé ✓', 'success');
      } catch (e) {
        clearInterval(progressInterval);
        showToast(e instanceof Error ? e.message : 'Publication échouée', 'info');
      } finally {
        setIsPublishing(false);
      }
    })();
  };

  const handleExportZip = async () => {
    try {
      showToast('Préparation du ZIP...', 'info');
      const zip = new JSZip();
      
      if (lastExport?.files?.length) {
        showToast('Exporting Full Project (Next.js)...', 'info');
        for (const f of lastExport.files) {
          zip.file(f.path, f.content);
        }
      } else {
        for (const [path, content] of Object.entries(filesMap)) {
          zip.file(path, content as string);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `huggy-project-${projectId || 'local'}.zip`);
      showToast('Export ZIP réussi !', 'success');
    } catch (e) {
      showToast('Erreur lors de l\'export ZIP', 'info');
    }
  };

  // Auto-save logic — real API calls, not simulated
  useEffect(() => {
    if (!autoSaveEnabled || activeBottomTab !== 'code' || !projectId || !databaseEnabled) return;

    const intervalId = setInterval(async () => {
      const path = activeFilePath;
      const content = filesMap[path];
      if (content === undefined) return;

      setIsSaving(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content }),
        });
        if (res.ok) setLastSaved(new Date());
      } catch {
        showToast('Sauvegarde automatique échouée', 'info');
      } finally {
        setIsSaving(false);
      }
    }, autoSaveInterval);

    return () => clearInterval(intervalId);
  }, [autoSaveEnabled, autoSaveInterval, activeBottomTab, projectId, databaseEnabled, activeFilePath, filesMap]);


  // ── Real-time collaboration (hook) ──────────────────────────────────
  const { onlineUsers, broadcastFileUpdate } = useCollaboration(
    projectId,
    user?.id,
    studioMode,
    (path, content) => setFilesMap(prev => ({ ...prev, [path]: content })),
    (event) => {
      // Received a stream event from a peer — spectate mode
      setIsSpectating(true);
      setCollabStreamEvents(prev => [...prev, event]);
      if (event.type === 'done') {
        setTimeout(() => setIsSpectating(false), 2000);
      }
    },
  );

  // ── Version History (hook) ────────────────────────────────────────────
  const { versions, isLoadingVersions, isRestoringVersion, loadVersions, restoreVersion: handleRestoreVersion } =
    useVersions(
      projectId,
      databaseEnabled,
      user?.id,
      (files) => {
        const map: Record<string, string> = {};
        for (const f of files) map[f.path] = f.content;
        setFilesMap(map);
      },
      showToast,
    );

  // ── Keyboard Shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    if (!studioMode) return;
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter → Send message
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (inputValue.trim() && !isGenerating) handleSendMessage();
      }
      // Ctrl+E → Export ZIP
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExportZip();
      }
      // Ctrl+Shift+P → Publish
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handlePublish();
      }
      // Escape → Close all modals
      if (e.key === 'Escape') {
        setShowExportModal(false);
        setShowSettingsModal(false);
        setShowAuthModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [studioMode, inputValue, isGenerating]);

  useEffect(() => {
    return () => {
      streamCancelRef.current?.();
      streamCancelRef.current = null;
    };
  }, []);

  // Terminal State
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal 1', lines: ['Welcome to Huggy Terminal', 'Connecting to container sandbox...', 'Ready.'] }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [terminalTheme, setTerminalTheme] = useState<TerminalTheme>('default');
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistorySearchOpen, setIsHistorySearchOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const activeTab = terminalTabs.find(t => t.id === activeTabId) || terminalTabs[0];

  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, agentTasks]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab.lines]);

  const addTerminalTab = () => {
    const newId = (terminalTabs.length + 1).toString();
    setTerminalTabs(prev => [...prev, { 
      id: newId, 
      name: `Terminal ${newId}`, 
      lines: [`Terminal ${newId} started.`, 'Ready.'] 
    }]);
    setActiveTabId(newId);
  };

  const removeTerminalTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminalTabs.length === 1) return;
    const newTabs = terminalTabs.filter(t => t.id !== id);
    setTerminalTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const updateTerminalLines = (newLines: string[]) => {
    setTerminalTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, lines: [...t.lines, ...newLines] } : t));
  };

  const clearTerminal = () => {
    setTerminalTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, lines: ['Terminal cleared.'] } : t));
  };

  const handleRestore = async (msg: Message) => {
    if (!msg.changedFiles || msg.changedFiles.length === 0) return;
    
    setIsRestoring(true);
    const file = msg.changedFiles[0];
    
    // Simulate restore process (removed artificial delay)
    // await new Promise(r => setTimeout(r, 1000));
    
    setFilesMap((prev) => ({
      ...prev,
      [file.path || PREVIEW_ENTRY]: file.current,
    }));
    
    setIsRestoring(false);
    
    // Add terminal log
    updateTerminalLines([`[SYSTEM] Restored to version from ${msg.timestamp.toLocaleTimeString()}`, `[SYSTEM] src/App.tsx reverted.`]);
  };

  const handleSendMessage = (textOverride?: string | React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const textToUse = typeof textOverride === 'string' ? textOverride : inputValue;
    if (!textToUse.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'VOUS',
      text: textToUse,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    if (isMagicMode) {
      setShowMagicStream(true);
      return;
    }

    streamCancelRef.current?.();
    streamCancelRef.current = null;
    setIsGenerating(true);
    setStreamingMessage('');
    setAgentTasks([]);

    const startTime = Date.now();

    // Real Agentic Streaming Pipeline — consumes /api/generate-app/agentic-stream SSE
    const runAgentWorkflow = async () => {
      const originalCode = filesMap[PREVIEW_ENTRY] || DEFAULT_PREVIEW_CODE;
      let updatedMap = { ...filesMap };
      let fullResponse = '';
      let aborted = false;

      // Last 30 messages only — prevents token explosion on long sessions
      const historyForAI = messages.slice(-30).map(m => ({ role: m.sender === 'VOUS' ? 'user' : 'assistant', content: m.text }));

      // Kick off SSE stream
      let response: Response;
      try {
        response = await fetch('/api/generate-app/agentic-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: newUserMsg.text,
            currentCode: originalCode,
            projectId,
            chatHistory: historyForAI,
            userId: user.id,
            userEmail: user.email,
          }),
        });
      } catch {
        setIsGenerating(false);
        setAgentTasks([]);
        showToast('Connexion au serveur impossible', 'info');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { setIsGenerating(false); return; }
      const decoder = new TextDecoder();
      let buffer = '';

      // Allow external cancel
      streamCancelRef.current = () => { aborted = true; reader.cancel(); };

      const processEvent = (raw: string) => {
        if (!raw.startsWith('data: ')) return;
        let event: any;
        try { event = JSON.parse(raw.slice(6)); } catch { return; }

        switch (event.type) {
          case 'agent_start':
            setAgentTasks(prev => {
              const agentTypeMap: Record<string, AgentTask['type']> = { pm: 'search', coder: 'edit', vr: 'lint' };
              const exists = prev.find(t => t.id === event.agent);
              if (exists) return prev.map(t => t.id === event.agent ? { ...t, label: event.label, status: 'running' } : t);
              return [...prev, { id: event.agent, label: event.label, status: 'running', type: agentTypeMap[event.agent] || 'edit' }];
            });
            break;

          case 'agent_done':
            setAgentTasks(prev => prev.map(t => t.id === event.agent
              ? { ...t, label: event.label, status: event.warning ? 'error' : 'success' }
              : t
            ));
            break;

          case 'credit_info':
            if (event.cost != null) setPendingCreditCost(event.cost);
            break;

          case 'schema_suggestion':
            if (event.sql) setSchemaSuggestion({ sql: event.sql, tables: event.tables || [], applying: false });
            break;

          case 'chunk':
            if (event.content) {
              setTerminalTabs(prev => prev.map(t => t.id === activeTabId
                ? { ...t, lines: t.lines.length > 200 ? t.lines.slice(-150) : t.lines }
                : t
              ));
            }
            break;

          case 'done': {
            const files: { path: string; content: string }[] = event.files || [];
            fullResponse = event.reply || (files.length > 0
              ? `Mise à jour appliquée (${files.length} fichier(s)).`
              : `Interface générée pour : « ${newUserMsg.text} ».`);

            if (files.length > 0) {
              for (const f of files) updatedMap[f.path] = f.content;
            } else if (event.code) {
              updatedMap[PREVIEW_ENTRY] = event.code;
            }

            const updatedCode = updatedMap[PREVIEW_ENTRY] || '';
            setFilesMap(updatedMap);

            // Update credits from response (no extra API call needed)
            if (event.creditsRemaining != null) {
              setCredits(event.creditsRemaining);
            } else if (user) {
              getMe({ userId: user.id, email: user.email }).then(d => setCredits(d.credits));
            }
            setPendingCreditCost(null);

            streamCancelRef.current = streamChatText(
              fullResponse,
              (partial) => setStreamingMessage(partial),
              () => {
                streamCancelRef.current = null;
                const huggyMsg: Message = {
                  id: (Date.now() + 1).toString(),
                  sender: 'HUGGY',
                  text: fullResponse,
                  timestamp: new Date(),
                  changedFiles: [{ path: PREVIEW_ENTRY, original: originalCode, current: updatedCode }],
                  durationMs: Date.now() - startTime,
                };
                setMessages(prev => [...prev, huggyMsg]);
                setStreamingMessage('');
                setIsGenerating(false);
                setAgentTasks([]);
                setTerminalTabs(prev => prev.map(t => t.id === activeTabId
                  ? { ...t, lines: [...t.lines, `[HUGGY] Tâche terminée : ${newUserMsg.text.substring(0, 40)}…`, '[HUGGY] Build OK — aperçu mis à jour.'] }
                  : t
                ));
              },
            );
            break;
          }

          case 'error':
            showToast(event.message || 'Erreur IA', 'info');
            setIsGenerating(false);
            setAgentTasks([]);
            setPendingCreditCost(null);
            // Show pricing modal if it's a plan limit error
            if (event.upgrade) setTimeout(() => setShowPricingModal(true), 500);
            break;
        }
      };

      // Read stream loop
      try {
        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.trim()) processEvent(line.trim());
          }
        }
      } catch (e) {
        if (!aborted) {
          console.error('[stream read]', e);
          showToast('Flux interrompu', 'info');
          setIsGenerating(false);
          setAgentTasks([]);
        }
      }
    };

    runAgentWorkflow();
  };

  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    updateTerminalLines([`$ ${cmd}`]);
    setCommandHistory(prev => [cmd, ...prev.filter(h => h !== cmd)].slice(0, 50));
    setHistoryIndex(-1);
    
    if (cmd === 'clear') {
      clearTerminal();
    } else if (cmd === 'ls') {
      updateTerminalLines(['src/  public/  package.json  vite.config.ts  index.html']);
    } else if (cmd === 'help') {
      updateTerminalLines(['Available commands:', '  ls      - List files', '  clear   - Clear terminal', '  help    - Show this help', '  theme   - Show current theme']);
    } else if (cmd === 'theme') {
      updateTerminalLines([`Current theme: ${terminalTheme}`]);
    } else {
      updateTerminalLines([`Command not found: ${cmd}`]);
    }
    
    setCommandInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const getPreviewSize = () => {
    switch (previewMode) {
      case 'mobile': return { 
        container: 'w-[390px] h-[844px] scale-[0.75] origin-center', 
        frame: 'rounded-[3.5rem] border-[14px] border-slate-900 shadow-2xl ring-1 ring-slate-800',
        inner: 'rounded-[2.5rem]'
      };
      case 'tablet': return { 
        container: 'w-[820px] h-[1180px] scale-[0.45] origin-center', 
        frame: 'rounded-[3rem] border-[18px] border-slate-900 shadow-2xl ring-1 ring-slate-800',
        inner: 'rounded-[2rem]'
      };
      default: return { 
        container: 'w-full h-full', 
        frame: 'border-none',
        inner: 'rounded-none'
      };
    }
  };

  const ACCENT_COLORS = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', light: 'bg-blue-50', ring: 'ring-blue-100' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', light: 'bg-purple-50', ring: 'ring-purple-100' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', light: 'bg-emerald-50', ring: 'ring-emerald-100' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', light: 'bg-rose-50', ring: 'ring-rose-100' },
  };

  const handleBillingPortal = async () => {
    try {
      showToast('Ouverture de l\'espace de facturation...', 'info');
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error || 'Erreur de paiement', 'info');
    } catch(e) { showToast('Erreur serveur', 'info'); }
  };

  const handleRenameProject = async (newName: string) => {
    if (!projectId || !user || newName === projectName) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: newName })
      });
      if (res.ok) {
        setProjectName(newName);
        showToast('Nom du projet sauvegardé', 'success');
      }
    } catch (e) {
      showToast('Erreur de renommage', 'info');
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-10 left-1/2 z-[200] px-6 py-3 bg-slate-900/90 dark:bg-white/95 backdrop-blur-xl text-white dark:text-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 min-w-[320px] border border-white/10 dark:border-slate-200"
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'} animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]`} />
            <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showMagicStream || (isSpectating && collabStreamEvents.length > 0)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          >
            <div className="w-full max-w-6xl h-full max-h-[800px] bg-white dark:bg-[#070708] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden relative">
              {isSpectating && (
                <div className="absolute top-6 left-6 z-[310] flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Mode Spectateur — Un collaborateur génère…</span>
                </div>
              )}
              <button 
                onClick={() => { setShowMagicStream(false); setIsSpectating(false); setCollabStreamEvents([]); }}
                className="absolute top-6 right-6 z-[310] p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-xl"
              >
                <X size={24} />
              </button>
              <FullAppStream 
                initialPrompt={inputValue}
                externalEvents={isSpectating ? collabStreamEvents : undefined}
                onDone={(files) => {
                  setShowMagicStream(false);
                  setIsSpectating(false);
                  setCollabStreamEvents([]);
                  showToast('Génération terminée avec succès !', 'success');
                }}
                onSend={isSpectating ? undefined : async (prompt) => {
                  return streamAgenticGeneration(prompt, {
                    projectId,
                    userId: user?.id,
                    userEmail: user?.email,
                    chatHistory: messages.slice(-20).map(m => ({ role: m.sender === 'VOUS' ? 'user' : 'assistant', content: m.text })),
                    currentCode: filesMap[PREVIEW_ENTRY]
                  });
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDebugStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          >
            <div className="w-full max-w-6xl h-full max-h-[800px] bg-white dark:bg-[#070708] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden relative">
              <button 
                onClick={() => setShowDebugStream(false)}
                className="absolute top-6 right-6 z-[310] p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-xl"
              >
                <X size={24} />
              </button>
              <DebugFixStream 
                initialPrompt={debugPrompt}
                onDone={(files) => {
                  if (files && files.length > 0) {
                    let updatedMap = { ...filesMap };
                    for (const f of files) {
                      updatedMap[f.path] = f.content;
                      broadcastFileUpdate(f.path, f.content);
                    }
                    setFilesMap(updatedMap);
                    showToast('Correction appliquée avec succès !', 'success');
                  }
                  setTimeout(() => setShowDebugStream(false), 2000);
                }}
                onSend={async (prompt) => {
                  return streamAgenticGeneration(prompt, {
                    projectId,
                    userId: user?.id,
                    userEmail: user?.email,
                    currentCode: filesMap[PREVIEW_ENTRY]
                  });
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
        onSuccess={() => {
          showToast('Accès Elite déverrouillé', 'success');
        }}
      />

      <SecretsModal
        isOpen={showSecretsModal}
        onClose={() => setShowSecretsModal(false)}
        projectId={projectId}
        userId={user?.id}
      />

      <AnimatePresence mode="wait">
        {studioMode ? (
          <motion.div
            key="studio"
            initial={{ opacity: 0, scale: 0.99, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.01, y: -5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className={`flex flex-col h-screen bg-slate-50 dark:bg-[#070708] text-slate-900 dark:text-slate-300 font-sans overflow-hidden transition-colors duration-300`}
          >
            {/* Show skeleton/loader if project data isn't ready yet but we have a projectId */}
            {projectId && Object.keys(filesMap).length <= 1 && (
              <div className="absolute inset-0 z-50 bg-white dark:bg-[#070708] flex flex-col items-center justify-center space-y-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-600/40"
                >
                  <Zap size={32} fill="currentColor" />
                </motion.div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Huggy Elite Engine</span>
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Séquence d'initialisation...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Navigation Bar — Professional Studio Aesthetic */}
            <header className="h-12 border-b border-white/[0.08] bg-[#0a0a0a] flex items-center justify-between px-4 z-20 shrink-0">
              {/* Left: Branding & Project context */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Zap size={16} className="text-white" fill="currentColor" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-white tracking-tighter uppercase italic">Huggy</span>
                    <ChevronRight size={12} className="text-white/20" />
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        onBlur={(e) => handleRenameProject(e.target.value)}
                        className="bg-transparent border-none p-0 text-[11px] font-bold text-white/90 focus:ring-0 focus:outline-none w-auto min-w-[80px] truncate"
                      />
                      <div className="flex items-center gap-1.5 -mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">Active Studio</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-6 border-l border-white/10 pl-4">
                  {[
                    { id: 'preview', icon: <Monitor size={15} />, label: 'Preview' },
                    { id: 'code', icon: <Code2 size={15} />, label: 'Editor' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveStudioTab(item.id as any)} 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${activeStudioTab === item.id ? 'bg-white/10 text-white shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                    >
                      {item.icon}
                      <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">{item.label}</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => setIsTerminalOpen(!isTerminalOpen)} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${isTerminalOpen ? 'bg-white/10 text-white shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                  >
                    <TerminalIcon size={15} />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">Terminal</span>
                  </button>
                </div>
              </div>

              {/* Center: Status Pill */}
              <div className="hidden xl:flex items-center px-4 py-1.5 bg-white/5 border border-white/10 rounded-full gap-3">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter">Engine v2.4</span>
                 </div>
                 <div className="w-px h-3 bg-white/10" />
                 <div className="flex items-center gap-2">
                    <Cloud size={12} className="text-white/30" />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter">Cloud Sync</span>
                 </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 mr-2">
                   <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Settings" onClick={() => setShowSettingsModal(true)}>
                      <Settings size={18} />
                   </button>
                   <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Share" onClick={() => setShowExportModal(true)}>
                      <ExternalLink size={18} />
                   </button>
                </div>

                <button
                  onClick={() => setShowPricingModal(true)}
                  className="group flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-violet-600/20"
                >
                  <Sparkles size={14} className="group-hover:rotate-12 transition-transform" fill="currentColor" />
                  Upgrade
                </button>

                <button
                  onClick={handlePublish}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Publish
                </button>
              </div>
            </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── PREVIEW TAB ────────────────────────────────────────────────────────── */}
        {activeStudioTab === 'preview' && (
          <div className="flex-1 flex overflow-hidden relative">
             <aside className="w-[340px] flex flex-col bg-[#0d0d0d] border-r border-white/[0.05] shrink-0 overflow-hidden">
               <div className="flex-1 flex flex-col min-h-0 border-b border-white/[0.05]">
                 <div className="px-5 py-4 border-b border-white/[0.03] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                     <History size={16} className="text-blue-500" />
                     <span className="text-[11px] font-black text-white/90 uppercase tracking-[0.2em]">Flux d'activité</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setActiveSidebarTab('chat')}
                        className={`p-1.5 rounded-lg transition-all ${activeSidebarTab === 'chat' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button 
                        onClick={() => setActiveSidebarTab('history')}
                        className={`p-1.5 rounded-lg transition-all ${activeSidebarTab === 'history' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                      >
                        <FileCode size={14} />
                      </button>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
                   {messages.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center opacity-10">
                        <Box size={48} strokeWidth={1} className="mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">System Standby</p>
                     </div>
                   )}
                   <div className="space-y-6">
                      {messages.map((msg) => (
                         <div key={msg.id} className="group relative">
                            <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-2">
                                  <div className={`w-1 h-3 rounded-full ${msg.sender === 'VOUS' ? 'bg-blue-500' : 'bg-violet-500'}`} />
                                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{msg.sender === 'VOUS' ? 'Requête' : 'Agent'}</span>
                               </div>
                               <span className="text-[8px] text-white/20 tracking-widest">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[12px] text-white/70 font-medium pl-3 border-l border-white/5">{msg.text}</p>
                         </div>
                      ))}
                   </div>
                 </div>
               </div>

               <div className="h-[280px] flex flex-col bg-[#080809] p-5 relative border-t border-white/[0.05]">
                 <div className="flex-1 flex flex-col">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">HUGGY COMMAND</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                         <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                         <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Auto-Scale</span>
                      </div>
                   </div>
                   <div className="flex-1 relative mb-4">
                     <HuggyChatInput
                       onSend={(prompt) => {
                         if (prompt) {
                           setInputValue(prompt);
                           setTimeout(() => handleSendMessage(), 0);
                         }
                       }}
                       isLoading={isGenerating}
                       placeholder="Décrivez votre vision..."
                       className="!p-0 !bg-transparent"
                       modelLabel="Huggy Elite"
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <button className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all border border-white/5">
                           <Plus size={14} />
                        </button>
                        <button className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all border border-white/5" onClick={() => setIsTerminalOpen(!isTerminalOpen)}>
                           <TerminalIcon size={14} />
                        </button>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all group">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white/70">Build Engine</span>
                        <ChevronDown size={12} className="text-white/20 group-hover:text-white/50" />
                     </div>
                   </div>
                 </div>
               </div>
             </aside>

             <main className="flex-1 flex flex-col overflow-hidden relative bg-[#070708] huggy-dot-grid">
               <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.05] shrink-0">
                 <div className="flex items-center gap-1">
                   {[
                     { id: 'desktop', icon: <Monitor size={13} /> },
                     { id: 'tablet', icon: <TabletIcon size={13} /> },
                     { id: 'mobile', icon: <Smartphone size={13} /> },
                   ].map(device => (
                     <button 
                       key={device.id}
                       onClick={() => setPreviewMode(device.id as any)}
                       className={`p-1.5 rounded-md transition-all ${previewMode === device.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                     >
                       {device.icon}
                     </button>
                   ))}
                 </div>
                 <div className="flex items-center gap-2 px-4 py-1 bg-white/5 border border-white/10 rounded-lg max-w-md w-full mx-4">
                    <Globe size={12} className="text-white/20" />
                    <span className="text-[11px] font-medium text-white/40 truncate flex-1">preview.huggy.studio</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                       <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[9px] font-black uppercase text-emerald-500">Live</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <button className="p-2 text-white/20 hover:text-white/60 transition-colors" onClick={() => window.location.reload()}>
                     <RefreshCw size={14} />
                   </button>
                   <button className="p-2 text-white/20 hover:text-white/60 transition-colors" onClick={() => window.open(publishedUrl || '#', '_blank')}>
                     <ExternalLink size={14} />
                   </button>
                 </div>
               </div>

               <div className="flex-1 flex items-center justify-center overflow-hidden relative min-h-0">
                 <motion.div 
                   layout
                   className={`relative transition-all duration-500 ease-in-out ${getPreviewSize().container} ${getPreviewSize().frame} overflow-hidden bg-white flex flex-col shadow-2xl shadow-black/40`}
                 >
                   <div className={`flex-1 ${getPreviewSize().inner} overflow-hidden relative`}>
                     <PreviewContent mode={previewMode} filesMap={filesMap} onCodeError={handleAutoCorrection} />
                   </div>
                 </motion.div>

                 {/* Console / Terminal Overlay */}
                 <AnimatePresence>
                   {isTerminalOpen && (
                     <motion.div 
                       initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                       transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                       className="absolute bottom-0 left-0 right-0 h-[280px] bg-[#0d0d0d] border-t border-white/[0.05] z-30 flex flex-col"
                     >
                       <div className="h-10 border-b border-white/[0.05] flex items-center justify-between px-4 bg-[#0a0a0a]">
                          <div className="flex items-center gap-2">
                             <TerminalIcon size={12} className="text-white/40" />
                             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Huggy Console</span>
                          </div>
                          <button onClick={() => setIsTerminalOpen(false)} className="p-1.5 text-white/20 hover:text-white/60">
                             <ChevronDown size={14} />
                          </button>
                       </div>
                       <div className="flex-1 p-4 font-mono text-[12px] text-white/60 overflow-y-auto scrollbar-hide">
                         {activeTab.lines.map((line, i) => <div key={i} className="mb-1">{line}</div>)}
                         <div ref={terminalEndRef} />
                       </div>
                       <form onSubmit={handleTerminalCommand} className="h-10 border-t border-white/[0.05] flex items-center px-4 bg-[#0a0a0a]">
                         <span className="text-emerald-500 font-bold mr-2">$</span>
                         <input 
                           type="text" 
                           value={commandInput}
                           onChange={(e) => setCommandInput(e.target.value)}
                           placeholder="Type a command..." 
                           className="flex-1 bg-transparent outline-none text-[12px] text-white/80 placeholder:text-white/10"
                         />
                       </form>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </main>
          </div>
        )}

        {/* ── CODE TAB ─────────────────────────────────────────────────────────── */}
        {activeStudioTab === 'code' && (
          <div className="flex-1 flex h-full overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
             <div className="w-[260px] border-r border-[#2b2b2b] bg-[#252526] overflow-y-auto shrink-0 py-4">
                <div className="px-6 mb-4 text-[10px] font-black text-[#858585] uppercase tracking-[0.2em] flex items-center justify-between">
                  <span>EXPLORATEUR</span>
                  <Plus size={12} className="cursor-pointer hover:text-white" onClick={addProjectFile} />
                </div>
                <div className="space-y-[1px]">
                  {Object.keys(filesMap).sort().map(path => (
                    <button
                      key={path}
                      onClick={() => {
                        setActiveFilePath(path);
                        setEditorLanguage(path.endsWith('.tsx') ? 'typescript' : path.endsWith('.css') ? 'css' : 'javascript');
                      }}
                      className={`w-full text-left px-6 py-1.5 text-[13px] font-medium flex items-center gap-2 group ${activeFilePath === path ? 'text-white bg-[#37373d]' : 'text-[#858585] hover:bg-[#2a2d2e]'}`}
                    >
                      <FileCode size={14} className={activeFilePath === path ? 'text-blue-400' : 'text-[#858585]'} />
                      <span className="truncate">{path.split('/').pop()}</span>
                    </button>
                  ))}
                </div>
             </div>
             <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
                <div className="h-9 border-b border-[#2b2b2b] bg-[#252526] flex items-center px-4">
                  <div className="flex items-center gap-2 px-4 h-full border-t-2 border-blue-500 bg-[#1e1e1e]">
                    <FileCode size={14} className="text-blue-400" />
                    <span className="text-[11px] font-medium text-[#cccccc]">{activeFilePath.split('/').pop()}</span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <Editor
                    height="100%" language={editorLanguage}
                    value={filesMap[activeFilePath] || ''} theme="vs-dark"
                    onChange={(val) => setFilesMap(prev => ({ ...prev, [activeFilePath]: val || '' }))}
                    options={{ 
                      minimap: { enabled: false }, 
                      fontSize: 13, 
                      fontFamily: "'Fira Code', monospace", 
                      padding: { top: 20 },
                      automaticLayout: true
                    }}
                  />
                </div>
             </div>
          </div>
        )}

        {/* ── DATABASE TAB ────────────────────────────────────────────────────── */}
        {activeStudioTab === 'database' && (
          <div className="flex-1 overflow-hidden">
            <DatabaseInterface projectId={projectId} />
          </div>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────────────── */}
        {activeStudioTab === 'analytics' && (
          <div className="flex-1 overflow-hidden">
            <ProjectAnalytics />
          </div>
        )}
      </div>
    </motion.div>
    ) : user ? (
      <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-screen">
        <UserDashboard 
          user={user} 
          credits={credits} 
          onOpenStudio={(p, pid) => { 
            if (pid) window.history.replaceState({}, '', `?project=${pid}`); 
            setStudioMode(true); 
            if (p) setInputValue(p); 
          }} 
          onLogout={() => signOut().then(() => setUser(null))} 
        />
      </motion.div>
      ) : (
        <motion.div 
          key="landing" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.5 }}
          className="h-screen overflow-y-auto bg-white dark:bg-[#030304]"
        >
          <LandingPage 
            onOpenStudio={(p) => { 
              setStudioMode(true); 
              if (p) setInputValue(p); 
            }} 
            onLogin={() => { setAuthMode('login'); setShowAuthModal(true); }} 
          />
        </motion.div>
      )}
  </AnimatePresence>

      {/* Publishing Modal */}
      <AnimatePresence>
        {isPublishing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center space-y-6"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 relative">
                <Cloud size={40} className={publishProgress < 100 ? 'animate-pulse' : ''} />
                {publishProgress < 100 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-blue-100"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={226}
                      strokeDashoffset={226 - (226 * publishProgress) / 100}
                      className="text-blue-600 transition-all duration-300"
                    />
                  </svg>
                )}
                {publishProgress === 100 && publishedUrl && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Check size={18} />
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {publishProgress < 100 ? 'Publication en cours...' : 'Application publiée !'}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {publishProgress < 100 
                    ? 'Nous préparons vos serveurs et déployons votre code sur le cloud.' 
                    : 'Votre application est maintenant en ligne et prête à être partagée.'}
                </p>
              </div>

              {publishProgress < 100 ? (
                <div className="w-full space-y-2">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${publishProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{publishProgress}% terminé</span>
                </div>
              ) : publishedUrl ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-4"
                >
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <span className="text-xs text-blue-600 font-bold truncate flex-1">{publishedUrl}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(publishedUrl);
                        // Simple visual feedback could be added here
                      }}
                      className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => window.open(publishedUrl, '_blank')}
                      className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                    >
                      Ouvrir le site
                    </button>
                    <button 
                      onClick={() => setIsPublishing(false)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                      Fermer
                    </button>
                  </div>
                </motion.div>
              ) : (
                <Loader2 size={24} className="animate-spin text-blue-600" />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} projectId={projectId || ''} userId={user?.id} />
      <GithubExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} projectId={projectId || ''} userId={user?.id} onStandardZipExport={handleExportZip} />

      {/* Onboarding */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            onClose={() => setShowOnboarding(false)}
            onOpenTemplates={() => setShowTemplates(true)}
          />
        )}
      </AnimatePresence>

      {/* Templates */}
      <AnimatePresence>
        {showTemplates && (
          <TemplatesModal
            onClose={() => setShowTemplates(false)}
            onSelectTemplate={(prompt) => {
              setInputValue(prompt);
              setShowTemplates(false);
              setTimeout(() => handleSendMessage(prompt), 100);
            }}
          />
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-16 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-6xl shadow-2xl relative">
              <button
                onClick={() => setShowPricingModal(false)}
                className="absolute top-5 right-5 z-10 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
              <PricingSection
                onCheckout={async (plan) => {
                  if (!user) { setShowAuthModal(true); setShowPricingModal(false); return; }
                  try {
                    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, userId: user.id }) });
                    const d = await res.json();
                    if (d.url) window.location.href = d.url;
                  } catch {}
                }}
                onOpenStudio={() => { setShowPricingModal(false); if (!studioMode) setStudioMode(true); }}
                userId={user?.id}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
