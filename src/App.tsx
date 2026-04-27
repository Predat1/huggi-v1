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
import { FullAppStream, StreamEvent } from './components/streaming';
import { StreamController } from './services/streamingService';
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
      const currentCode = filesMap[PREVIEW_ENTRY];
      if (!currentCode) return;
      
      const gen = await requestAutoCorrection(currentCode, errorMessage, {
        projectId,
        userId: user.id,
        userEmail: user.email
      });
      
      if (gen.files.length) {
        let updatedMap = { ...filesMap };
        for (const f of gen.files) {
          updatedMap[f.path] = f.content;
        }
        setFilesMap(updatedMap);
        updateTerminalLines([`[SYSTEM] Auto-correction réussie. Code mis à jour.`]);
      }
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

      <AnimatePresence mode="wait" initial={false}>
        {studioMode ? (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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

            {/* Top Navigation Bar — Premium Elite Studio */}
            <header className="h-16 border-b border-slate-200 dark:border-white/[0.03] bg-white/80 dark:bg-[#070708]/80 backdrop-blur-2xl flex items-center justify-between px-6 z-10 shrink-0">
              {/* Left: Brand & Breadcrumbs */}
              <div className="flex items-center gap-6 min-w-0">
                <motion.button 
                  whileHover={{ x: -3 }}
                  onClick={() => {
                    setStudioMode(false);
                    window.history.replaceState({}, '', window.location.pathname);
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Dashboard"
                >
                  <ChevronLeft size={20} />
                </motion.button>
                
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Folder size={14} className="text-slate-300 dark:text-slate-600" />
                    <span className="hidden sm:inline">Projets</span>
                    <ChevronRight size={12} className="text-slate-300 dark:text-slate-700" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onBlur={(e) => handleRenameProject(e.target.value)}
                      className="bg-transparent border-none p-0 text-sm font-black text-slate-900 dark:text-white focus:ring-0 w-32 sm:w-auto min-w-[100px] truncate hover:bg-slate-100 dark:hover:bg-white/5 rounded px-1 transition-colors"
                      placeholder="Nom du projet..."
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                        {activeFilePath.split('/').pop()}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">V1.0</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* REST OF HEADER ACTIONS ARE ALREADY IN THE FILE */}


        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {credits !== null && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
              <Sparkles size={12} className="text-amber-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 leading-none">
                  {Number.isInteger(credits) ? credits : credits.toFixed(1)} <span className="text-[8px] opacity-60">CREDITS</span>
                </span>
              </div>
            </div>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Secondary Actions Group */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSecretsModal(true)}
              className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-all"
              title="Secrets & Env"
            >
              <Shield size={18} />
            </button>
            
            <div className="relative group/menu">
              <button
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all text-xs font-bold"
              >
                <Download size={14} />
                <span className="hidden md:inline">Exporter</span>
                <ChevronDown size={12} />
              </button>
              
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all z-50 p-1.5">
                <button onClick={handleExportZip} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">
                  <HardDrive size={14} /> Télécharger .ZIP
                </button>
                <button onClick={() => setShowExportModal(true)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">
                  <Github size={14} /> Push vers GitHub
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action: Publish */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="relative flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/10 overflow-hidden group/pub"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover/pub:opacity-100 transition-opacity" />
            <Globe size={14} className={`relative z-10 ${isPublishing ? 'animate-spin' : ''}`} />
            <span className="relative z-10">{isPublishing ? 'PUBLICATION...' : 'PUBLIER'}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

          {/* User Avatar */}
          {user && (
            <button
              onClick={() => signOut().then(() => setUser(null))}
              className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-black text-slate-600 dark:text-white hover:ring-4 hover:ring-blue-500/10 transition-all shrink-0 active:scale-90"
              title={user.email || 'Mon compte'}
            >
              {(user.email || 'U')[0].toUpperCase()}
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-[400px]'} border-r border-slate-200 bg-white flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between relative min-h-[57px]">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 ${ACCENT_COLORS[activeAccentColor].bg} rounded-sm`} />
                <span className="font-bold text-sm text-slate-700">Huggy Studio</span>
              </div>
            )}
            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all ${isSidebarCollapsed ? 'mx-auto' : ''}`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <Plus size={18} /> : <Maximize2 size={16} className="rotate-45" />}
            </button>



            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
              <button 
                onClick={() => setActiveSidebarTab('chat')}
                className={`p-1.5 rounded transition-colors ${activeSidebarTab === 'chat' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Chat"
              >
                <MessageSquare size={18} />
              </button>
              <button 
                onClick={() => setActiveSidebarTab('history')}
                className={`p-1.5 rounded transition-colors ${activeSidebarTab === 'history' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="History"
              >
                <History size={18} />
              </button>
              </div>
            )}
          </div>

          <div className={`flex-1 flex flex-col min-h-0 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
            {activeSidebarTab === 'chat' ? (
              <>
                {/* ── Chat Messages ── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
                  {messages.length === 0 && !isGenerating && (
                    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-600/30">
                          <Zap size={28} className="text-white" fill="currentColor" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-800 dark:text-white">Huggy Studio</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-[260px] leading-relaxed">Décrivez l'application que vous souhaitez créer. L'IA construira tout pour vous.</p>
                      </div>

                    </div>
                  )}

                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex ${msg.sender === 'VOUS' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[88%] ${msg.sender === 'VOUS' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                        {msg.sender === 'HUGGY' && (
                          <div className="flex items-center gap-1.5 px-1">
                            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                              <Zap size={10} className="text-white" fill="currentColor" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huggy</span>
                            {msg.durationMs && (
                              <span className="text-[9px] text-slate-300 font-medium ml-0.5">· {(msg.durationMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed group/msg relative ${
                          msg.sender === 'VOUS'
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-md shadow-lg shadow-blue-600/15'
                            : 'bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-white/5 rounded-tl-md shadow-sm'
                        }`}>
                          {msg.text}
                          {/* Copy button */}
                          {msg.sender === 'HUGGY' && (
                            <button
                              onClick={() => { navigator.clipboard.writeText(msg.text); showToast('Copié !', 'success'); }}
                              className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-50 opacity-0 group-hover/msg:opacity-100 transition-all"
                              title="Copier"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                        {msg.changedFiles && msg.changedFiles.length > 0 && (
                          <div className="flex items-center gap-1.5 px-1 mt-0.5">
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100/80">
                              <FileCode size={10} />
                              {msg.changedFiles.length} fichier(s) modifié(s)
                            </div>
                            <button
                              onClick={() => handleRestore(msg)}
                              disabled={isRestoring}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100/80 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
                              Restaurer
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* ── Streaming / Generating state ── */}
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[88%] flex flex-col gap-2 items-start">
                        <div className="flex items-center gap-1.5 px-1">
                          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                            <Zap size={10} className="text-white animate-pulse" fill="currentColor" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huggy</span>
                          <span className="text-[9px] text-blue-500 font-semibold animate-pulse">en réflexion...</span>
                        </div>
                        {/* Agent task cards */}
                        {agentTasks.length > 0 && (
                          <div className="flex flex-col gap-1.5 w-full">
                            {agentTasks.map((task) => (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium border backdrop-blur-sm ${
                                  task.status === 'running'
                                    ? 'bg-amber-50/80 border-amber-200/60 text-amber-800'
                                    : task.status === 'error'
                                    ? 'bg-red-50/80 border-red-200/60 text-red-700'
                                    : 'bg-emerald-50/60 border-emerald-100/60 text-emerald-700'
                                }`}
                              >
                                {task.status === 'running' ? (
                                  <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />
                                ) : task.status === 'success' ? (
                                  <Check size={12} className="text-emerald-500 shrink-0" />
                                ) : (
                                  <X size={12} className="text-red-500 shrink-0" />
                                )}
                                <span className="truncate">{task.label}</span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                        {/* Streaming text or thinking shimmer */}
                        {streamingMessage ? (
                          <div className="bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-md px-4 py-3 text-[14px] leading-relaxed shadow-sm">
                            {streamingMessage}
                            <span className="inline-block w-[2px] h-4 bg-blue-500 ml-0.5 align-text-bottom huggy-stream-caret" />
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1 shadow-sm">
                            <div className="huggy-thinking-shimmer rounded-lg h-4 w-32" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── Schema Suggestion Panel ── */}
                {schemaSuggestion && (
                  <div className="shrink-0 mx-3 mb-2 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100 dark:border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center"><Database size={10} className="text-white" /></div>
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Schéma BD suggéré</span>
                        <span className="text-[9px] text-blue-500 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full font-semibold">{schemaSuggestion.tables.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            if (!projectId || !user?.id) return;
                            setSchemaSuggestion(s => s ? { ...s, applying: true } : null);
                            try {
                              const r = await fetch(`/api/projects/${projectId}/apply-schema`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sql: schemaSuggestion.sql, userId: user.id }),
                              });
                              const d = await r.json();
                              if (!r.ok) throw new Error(d.error || 'Erreur');
                              showToast('Schéma appliqué ✓', 'success');
                              setSchemaSuggestion(null);
                            } catch (e: any) {
                              showToast(e.message || 'Erreur lors de l\'application', 'info');
                              setSchemaSuggestion(s => s ? { ...s, applying: false } : null);
                            }
                          }}
                          disabled={schemaSuggestion.applying || !projectId}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {schemaSuggestion.applying ? 'Application…' : 'Appliquer à Supabase'}
                        </button>
                        <button onClick={() => setSchemaSuggestion(null)} className="text-[10px] text-blue-400 hover:text-blue-600 px-1">✕</button>
                      </div>
                    </div>
                    <pre className="text-[9px] text-blue-800 dark:text-blue-200 font-mono px-3 py-2 overflow-x-auto max-h-32 leading-relaxed">{schemaSuggestion.sql}</pre>
                  </div>
                )}

                {/* ── Chat Input ── */}
                <div className="shrink-0 p-3 bg-gradient-to-t from-white via-white to-white/80 dark:from-[#0d0d0d] dark:via-[#0d0d0d] dark:to-transparent border-t border-slate-100/50 dark:border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowTemplates(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
                    >
                      <Layout size={10} />
                      Templates
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPricingModal(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
                    >
                      <Sparkles size={10} />
                      Upgrade
                    </button>
                  </div>
                  <HuggyChatInput
                    onSend={(prompt) => {
                      if (prompt) {
                        setInputValue(prompt);
                        setTimeout(() => handleSendMessage(), 0);
                      }
                    }}
                    isLoading={isGenerating}
                    placeholder="Décrivez ce que vous voulez construire..."
                    modelLabel="Huggy AI"
                  />
                </div>
              </>
            ) : activeSidebarTab === 'history' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {/* Version History */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Versions</h2>
                  <button
                    onClick={loadVersions}
                    disabled={isLoadingVersions}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw size={13} className={isLoadingVersions ? 'animate-spin' : ''} />
                  </button>
                </div>

                {versions.length === 0 && !isLoadingVersions && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">
                    Aucune version sauvegardée.<br />Les snapshots sont créés automatiquement avant chaque génération IA et chaque déploiement.
                  </p>
                )}

                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{v.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {new Date(v.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {v.file_count} fichier{v.file_count > 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreVersion(v.id)}
                          disabled={isRestoringVersion}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={10} className={isRestoringVersion ? 'animate-spin' : ''} />
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Timeline */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                  <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Timeline Chat</h2>
                  <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-white/10">
                    {messages.filter((m: any) => m.sender === 'VOUS' || m.changedFiles).map((m: any) => (
                      <div key={m.id} className="relative pl-8 group">
                        <div className={`absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full border-4 border-white dark:border-[#1a1a2e] shadow-sm flex items-center justify-center z-10 ${
                          m.sender === 'VOUS' ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300' : 'bg-blue-500 text-white'
                        }`}>
                          {m.sender === 'VOUS' ? <Search size={10} /> : <Zap size={10} fill="currentColor" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              {m.sender === 'VOUS' ? 'Requête' : 'Agent'}
                            </span>
                            <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium">
                              {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 group-hover:line-clamp-none transition-all break-words">
                            {m.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
                No other tabs available.
              </div>
            )}
            
            {agentTasks.map(task => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2 z-50 text-xs text-slate-600"
                >
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                  Code compilation in progress...
                </motion.div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F8F9FB]">
          {/* Main Toolbar (Browser Bar Mode) */}
          <div className="h-14 px-4 flex items-center gap-4 bg-white border-b border-slate-200 shrink-0">
            {/* Left: Device Toggles */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-lg transition-all ${previewMode === 'desktop' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                title="Desktop"
              >
                <Monitor size={14} />
              </button>
              <button 
                onClick={() => setPreviewMode('tablet')}
                className={`p-1.5 rounded-lg transition-all ${previewMode === 'tablet' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                title="Tablet"
              >
                <TabletIcon size={14} />
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-lg transition-all ${previewMode === 'mobile' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                title="Mobile"
              >
                <Smartphone size={14} />
              </button>
            </div>

            {/* Center: URL Bar (Restored & Clean) */}
            <div className="flex-1 max-w-xl mx-auto hidden sm:flex items-center gap-3 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 transition-all">
              <div className="flex items-center gap-2 text-slate-400">
                <Globe size={14} className="group-hover:text-blue-500 transition-colors" />
                <span className="text-[11px] font-bold tracking-tight text-slate-400/80">https://</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate flex-1">
                project-preview.huggy.studio
              </span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setIsSaving(true);
                  setTimeout(() => {
                    setIsSaving(false);
                    setLastSaved(new Date());
                    showToast('Aperçu actualisé', 'info');
                  }, 800);
                }}
                className={`p-2 rounded-xl transition-all ${isSaving ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
                title="Refresh preview"
              >
                <RotateCw size={15} className={isSaving ? 'animate-spin' : ''} />
              </button>
              
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink size={15} />
              </button>

              <div className="h-6 w-[1px] bg-slate-100 mx-1" />

              {/* Cloud Menu Toggle */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowCloudMenu(!showCloudMenu)}
                  className={`p-2 rounded-xl transition-colors ${showCloudMenu ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  title="Espace Cloud"
                >
                  <Cloud size={16} />
                </button>
                <AnimatePresence>
                  {showCloudMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 text-left"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espace Cloud</h4>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Opérationnel</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Database size={14} className="text-blue-500" />
                            <span>Database Cluster</span>
                          </div>
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[42%]" />
                          </div>
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                            <span>Utilisation</span>
                            <span>42%</span>
                          </div>
                        </div>

                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Déploiements Récents</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {deployments.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">En attente du premier push...</p>
                          ) : (
                            deployments.map(dep => (
                              <div key={dep.id} className="p-2.5 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <Globe size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{dep.url}</span>
                                  </div>
                                  <span className="text-[9px] font-medium text-slate-400">{dep.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="px-1.5 py-0.5 bg-blue-50 rounded text-[8px] font-black text-blue-600 uppercase tracking-widest">Production</div>
                                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-600">Actif</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Design Menu */}
               <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowDesignMenu(!showDesignMenu)}
                  className={`p-2 rounded-xl transition-colors ${showDesignMenu ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  title="Thème & Design"
                >
                  <Palette size={16} />
                </button>
                <AnimatePresence>
                  {showDesignMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50"
                    >
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Palettes Studio</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>).map((key) => (
                          <button
                            key={key}
                            onClick={() => {
                              setActiveAccentColor(key);
                              showToast(`Thème ${key} activé`, 'info');
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${activeAccentColor === key ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-100 hover:bg-slate-50'}`}
                          >
                            <div className={`w-4 h-4 rounded-full ${ACCENT_COLORS[key].bg} border border-white/20`} />
                            <span className="text-[11px] font-bold text-slate-600 capitalize">{key}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium italic">Personnalise l'identité visuelle de votre SaaS Huggy en un clic.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>





          {/* Preview & Terminal Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Preview Window */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative min-h-0 bg-white">
              <motion.div 
                layout
                className={`relative transition-all duration-500 ease-in-out ${getPreviewSize().container} ${getPreviewSize().frame} overflow-hidden bg-white flex flex-col`}
              >
                {/* Device Camera/Notch Layout for mobile viewports */}
                {previewMode === 'mobile' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                    <div className="w-8 h-1 rounded-full bg-slate-800" />
                  </div>
                )}


                
                <div className={`flex-1 ${getPreviewSize().inner} overflow-hidden relative`}>
                  <PreviewContent
                    mode={previewMode}
                    filesMap={filesMap}
                    onCodeError={handleAutoCorrection}
                  />
                </div>
              </motion.div>

              {/* Floating Terminal Overlay */}
              <AnimatePresence>
                {isTerminalOpen && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`absolute bottom-0 left-0 right-0 h-[300px] ${TERMINAL_THEMES[terminalTheme].bg} border-t ${TERMINAL_THEMES[terminalTheme].border} shadow-2xl z-30 flex flex-col overflow-hidden`}
                  >
                    {/* Terminal Header */}
                    <div className={`h-10 border-b ${TERMINAL_THEMES[terminalTheme].border} flex items-center justify-between px-4 ${TERMINAL_THEMES[terminalTheme].accent}`}>
                      <div className="flex items-center gap-2 h-full overflow-x-auto scrollbar-hide">
                        {terminalTabs.map(tab => (
                          <div 
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`flex items-center gap-2 h-full px-3 cursor-pointer transition-all border-b-2 text-xs font-medium ${activeTabId === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                          >
                            <TerminalIcon size={12} />
                            <span>{tab.name}</span>
                            {terminalTabs.length > 1 && (
                              <button 
                                onClick={(e) => removeTerminalTab(tab.id, e)}
                                className="hover:bg-slate-200 rounded p-0.5"
                              >
                                <Plus size={10} className="rotate-45" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button 
                          onClick={addTerminalTab}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Theme Switcher */}
                        <div className="flex items-center gap-1 bg-slate-200/50 p-0.5 rounded-lg">
                          {(Object.keys(TERMINAL_THEMES) as TerminalTheme[]).map(t => (
                            <button
                              key={t}
                              onClick={() => setTerminalTheme(t)}
                              className={`w-4 h-4 rounded-full border border-white/20 transition-all ${t === terminalTheme ? 'ring-2 ring-blue-500 scale-110' : 'opacity-50 hover:opacity-100'} ${TERMINAL_THEMES[t].bg}`}
                              title={t}
                            />
                          ))}
                        </div>
                        <div className="h-4 w-[1px] bg-slate-300" />
                        <button 
                          onClick={() => setIsHistorySearchOpen(!isHistorySearchOpen)}
                          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${isHistorySearchOpen ? 'text-blue-600' : 'text-slate-400'}`}
                        >
                          <Search size={14} />
                        </button>
                        <button 
                          onClick={() => setIsTerminalOpen(false)}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-400 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>

                    {/* History Search Bar */}
                    <AnimatePresence>
                      {isHistorySearchOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={`px-4 py-2 border-b ${TERMINAL_THEMES[terminalTheme].border} ${TERMINAL_THEMES[terminalTheme].accent} flex items-center gap-2`}
                        >
                          <Search size={12} className="text-slate-400" />
                          <input 
                            type="text"
                            value={historySearchQuery}
                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                            placeholder="Search command history..."
                            className="bg-transparent outline-none text-[11px] text-slate-500 flex-1"
                            autoFocus
                          />
                          {historySearchQuery && (
                          <div className="absolute top-full left-0 right-0 max-h-32 overflow-y-auto bg-white border border-slate-200 shadow-xl z-40 rounded-b-xl">
                            {commandHistory
                              .filter(h => h.toLowerCase().includes(historySearchQuery.toLowerCase()))
                              .map((h, i) => (
                                <div 
                                  key={i}
                                  onClick={() => {
                                    setCommandInput(h);
                                    setIsHistorySearchOpen(false);
                                    setHistorySearchQuery('');
                                  }}
                                  className="px-4 py-2 text-xs text-slate-600 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                >
                                  {h}
                                </div>
                              ))
                            }
                          </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Terminal Content */}
                    <div className={`flex-1 p-4 font-mono text-sm ${TERMINAL_THEMES[terminalTheme].text} space-y-1 overflow-y-auto scrollbar-hide`}>
                      {activeTab.lines.map((line, i) => (
                        <p key={i} className={line.startsWith('$') ? `font-bold ${TERMINAL_THEMES[terminalTheme].text.replace('text-', 'text-opacity-100 ')}` : 'italic opacity-60'}>
                          {line}
                        </p>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>

                    {/* Terminal Input */}
                    <form onSubmit={handleTerminalCommand} className={`h-10 border-t ${TERMINAL_THEMES[terminalTheme].border} flex items-center justify-between px-4 ${TERMINAL_THEMES[terminalTheme].accent}`}>
                      <div className="flex items-center gap-2 flex-1">
                        <span className={`${TERMINAL_THEMES[terminalTheme].prompt} font-bold`}>$</span>
                        <input 
                          type="text" 
                          value={commandInput}
                          onChange={(e) => setCommandInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type a command..." 
                          className={`flex-1 bg-transparent outline-none text-xs ${TERMINAL_THEMES[terminalTheme].text} placeholder:text-slate-500`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Local</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Code Overlay */}
              <AnimatePresence>
                {activeBottomTab === 'code' && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="absolute bottom-0 left-0 right-0 h-[min(420px,55vh)] bg-white border-t border-slate-200 shadow-2xl z-30 flex flex-col overflow-hidden"
                  >
                    <div className="h-10 border-b border-slate-100 flex items-center justify-between px-2 sm:px-4 bg-slate-50/50 gap-2 overflow-x-auto scrollbar-hide">
                      <div className="flex items-center gap-2 h-full min-w-0">
                        <div className="flex items-center gap-2 h-full border-b-2 border-blue-600 px-1 shrink-0">
                          <Code2 size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[140px] sm:max-w-[220px]" title={activeFilePath}>
                            {activeFilePath}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={addProjectFile}
                          className="shrink-0 p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Nouveau fichier"
                        >
                          <Plus size={16} />
                        </button>
                        
                        <div className="flex items-center gap-1 bg-slate-200/50 p-0.5 rounded-md">
                          <button 
                            onClick={() => setEditorTheme('vs-light')}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${editorTheme === 'vs-light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                          >
                            Light
                          </button>
                          <button 
                            onClick={() => setEditorTheme('vs-dark')}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${editorTheme === 'vs-dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                          >
                            Dark
                          </button>
                        </div>

                        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={handleUndo}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Undo (Ctrl+Z)"
                          >
                            <Undo size={14} />
                          </button>
                          <button 
                            onClick={handleRedo}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Redo (Ctrl+Y)"
                          >
                            <Redo size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSaving ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-medium">
                            <Loader2 size={10} className="animate-spin" />
                            Saving...
                          </div>
                        ) : lastSaved ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                            <Check size={10} className="text-emerald-500" />
                            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        ) : null}
                        
                        <div className="relative">
                          <button 
                            onClick={() => setShowAutoSaveSettings(!showAutoSaveSettings)}
                            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${showAutoSaveSettings ? 'text-blue-600 bg-slate-200' : 'text-slate-400'}`}
                            title="Auto-save Settings"
                          >
                            <Settings size={14} />
                          </button>
                          
                          <AnimatePresence>
                            {showAutoSaveSettings && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-700">Auto-save</span>
                                    <button 
                                      onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                                      className={`w-8 h-4 rounded-full transition-colors relative ${autoSaveEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                                    >
                                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoSaveEnabled ? 'left-4.5' : 'left-0.5'}`} />
                                    </button>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-700">Minimap</span>
                                    <button 
                                      onClick={() => setShowMinimap(!showMinimap)}
                                      className={`w-8 h-4 rounded-full transition-colors relative ${showMinimap ? 'bg-blue-500' : 'bg-slate-300'}`}
                                    >
                                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showMinimap ? 'left-4.5' : 'left-0.5'}`} />
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] text-slate-500 font-medium">Interval</span>
                                    <div className="grid grid-cols-2 gap-1">
                                      {[1000, 5000, 10000, 30000].map(interval => (
                                        <button
                                          key={interval}
                                          onClick={() => setAutoSaveInterval(interval)}
                                          className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${autoSaveInterval === interval ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                                        >
                                          {interval / 1000}s
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                          {databaseEnabled ? 'Sync Postgres' : 'Local'}
                        </span>
                        <button 
                          onClick={() => setActiveBottomTab('terminal')}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-400 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-0.5 px-2 py-1 border-b border-slate-100 overflow-x-auto scrollbar-hide bg-slate-50/80 shrink-0">
                      {Object.keys(filesMap)
                        .sort()
                        .map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => openProjectFile(p)}
                            className={`shrink-0 max-w-[160px] truncate px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                              p === activeFilePath
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200'
                            }`}
                            title={p}
                          >
                            {p.replace(/^src\//, '')}
                          </button>
                        ))}
                    </div>
                    <div className="flex-1 relative bg-white min-h-0">
                      <Editor
                        height="100%"
                        language={editorLanguage}
                        theme={editorTheme}
                        value={filesMap[activeFilePath] ?? ''}
                        onMount={handleEditorDidMount}
                        onChange={(value) =>
                          setFilesMap((f) => ({
                            ...f,
                            [activeFilePath]: value || '',
                          }))
                        }
                        options={{
                          minimap: { enabled: showMinimap },
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          folding: true,
                          bracketPairColorization: { enabled: true },
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          lineNumbers: 'on',
                          renderLineHighlight: 'all',
                          padding: { top: 10, bottom: 10 }
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Resize Handle (Visual only) */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-slate-200 rounded-full -ml-0.5 cursor-col-resize hover:bg-blue-400 transition-colors z-20" />
        </main>
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
      <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-screen overflow-y-auto">
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
