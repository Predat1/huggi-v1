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
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';
import { DEFAULT_PREVIEW_CODE } from './defaultPreviewCode';
import { generateAppUpdate, getMe } from './services/geminiService';
import { streamChatText } from './utils/streamChatText';
import LandingPage from './components/LandingPage';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getAuthUser, onAuthStateChange, signIn, signUp } from './lib/supabaseClient';
import { FullAppStream, StreamEvent } from './components/streaming';
import { StreamController } from './services/streamingService';
import { SettingsModal } from './components/SettingsModal';
import { GithubExportModal } from './components/GithubExportModal';
import HuggyChatInput from './components/HuggyChatInput';

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

const PreviewContent = ({ mode, code }: { mode: PreviewMode; code: string }) => {
  const isMobile = mode === 'mobile';
  const isTablet = mode === 'tablet';

  const scope = { 
    React, 
    ...LucideIcons, 
    motion, 
    AnimatePresence 
  };

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col overflow-hidden relative">
      <LiveProvider code={code} scope={scope} noInline={false}>
        <div className="w-full h-full overflow-y-auto scrollbar-hide">
          <LivePreview />
          <LiveError className="p-4 bg-red-50 text-red-600 text-xs font-mono whitespace-pre-wrap border-t border-red-100" />
        </div>
      </LiveProvider>
    </div>
  );
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'HUGGY',
    text: "Bonjour ! Je suis Huggy, votre assistant de design intelligent. Que souhaitez-vous construire aujourd'hui ?",
    timestamp: new Date()
  }
];

const PREVIEW_ENTRY = 'src/App.tsx';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('chat');
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'code'>('terminal');
  const editorRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [lastExport, setLastExport] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

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
  const [databaseEnabled, setDatabaseEnabled] = useState(false);
  // Landing par défaut : si aucun `?project=` n'est présent, on affiche une page marketing.
  const [studioMode, setStudioMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('project')) || params.get('studio') === '1';
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
          for (const f of data.files) map[f.path] = f.content;
          setProjectId(pid);
          setFilesMap(map);
          setActiveFilePath(PREVIEW_ENTRY);
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

  // Auto-send prompt from landing page
  useEffect(() => {
    if (studioMode && inputValue && messages.length === 1 && !isGenerating) {
      const t = setTimeout(() => {
        handleSendMessage();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [studioMode, user]); // Trigger when studio opens or user loads

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
        .then(() => setLastSaved(new Date()))
        .catch(() => showToast('Sauvegarde échouée', 'info'));
    }, 900);
    return () => clearTimeout(t);
  }, [filesMap, activeFilePath, projectId, databaseEnabled]);

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
    (async () => {
      try {
        setPublishProgress(40);
        const res = await fetch(`/api/projects/${projectId}/deploy`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        setPublishProgress(100);
        setPublishedUrl(data.url);
        setDeployments((prev) => [
          {
            id: data.deploymentId,
            url: data.url,
            date: new Date(),
          },
          ...prev,
        ]);
        showToast('Déploiement terminé', 'success');
      } catch (e) {
        showToast(
          e instanceof Error ? e.message : 'Publication échouée',
          'info',
        );
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

  // Auto-save logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoSaveEnabled && activeBottomTab === 'code') {
      intervalId = setInterval(() => {
        setIsSaving(true);
        // Simulate saving
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        }, 800);
      }, autoSaveInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoSaveEnabled, autoSaveInterval, activeBottomTab]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const streamCancelRef = useRef<(() => void) | null>(null);

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
    
    // Simulate restore process
    await new Promise(r => setTimeout(r, 1000));
    
    setFilesMap((prev) => ({
      ...prev,
      [file.path || PREVIEW_ENTRY]: file.current,
    }));
    
    setIsRestoring(false);
    
    // Add terminal log
    updateTerminalLines([`[SYSTEM] Restored to version from ${msg.timestamp.toLocaleTimeString()}`, `[SYSTEM] src/App.tsx reverted.`]);
  };

  const handleSendMessage = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'VOUS',
      text: inputValue,
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

    // Simulate Agent Workflow (Google AI Studio Build style)
    const runAgentWorkflow = async () => {
      const tasks: AgentTask[] = [
        { id: '1', label: 'Analyzing project structure...', status: 'running', type: 'search' },
      ];
      setAgentTasks(tasks);

      // Step 1: Search/Analyze
      await new Promise(r => setTimeout(r, 400));
      setAgentTasks(prev => prev.map(t => t.id === '1' ? { ...t, status: 'success' } : t));
      
      // Step 2: Read file
      const readTask: AgentTask = { id: '2', label: 'Reading src/App.tsx...', status: 'running', type: 'read' };
      setAgentTasks(prev => [...prev, readTask]);
      await new Promise(r => setTimeout(r, 300));
      setAgentTasks(prev => prev.map(t => t.id === '2' ? { ...t, status: 'success' } : t));

      // Step 3: Edit file
      const editTask: AgentTask = { id: '3', label: 'Generating high-quality code...', status: 'running', type: 'edit' };
      setAgentTasks(prev => [...prev, editTask]);
      
      const originalCode = filesMap[PREVIEW_ENTRY] || DEFAULT_PREVIEW_CODE;
      let updatedMap = { ...filesMap };
      let fullResponse = '';

      try {
        const historyForAI = messages.map(m => ({ role: m.sender === 'VOUS' ? 'user' : 'assistant', content: m.text }));
        const gen = await generateAppUpdate(newUserMsg.text, {
          currentCode: originalCode,
          projectId,
          chatHistory: historyForAI,
          userId: user.id,
          userEmail: user.email
        });
        if (gen.export) {
          setLastExport(gen.export);
        }
        if (gen.files.length) {
          for (const f of gen.files) {
            updatedMap[f.path] = f.content;
          }
          fullResponse =
            gen.reply ||
            `Mise à jour appliquée (${gen.files.length} fichier(s)) — ${gen.provider || 'IA'}.`;
        } else if (gen.code) {
          updatedMap[PREVIEW_ENTRY] = gen.code;
          fullResponse =
            gen.reply ||
            `J'ai conçu une interface pour : « ${newUserMsg.text} ».`;
        } else {
          throw new Error('Réponse vide');
        }
      } catch (error) {
        console.error('IA:', error);
        const fallback = originalCode.replace(
          'Bienvenue',
          newUserMsg.text.substring(0, 24),
        );
        updatedMap[PREVIEW_ENTRY] = fallback;
        fullResponse = `[Simulation] ${newUserMsg.text.slice(0, 80)}… — configurez ANTHROPIC_API_KEY ou GEMINI_API_KEY sur le serveur.`;
      }

      setFilesMap(updatedMap);
      const updatedCode = updatedMap[PREVIEW_ENTRY] || '';

      setAgentTasks(prev => prev.map(t => t.id === '3' ? { ...t, status: 'success' } : t));

      // Step 4: Compile
      const compileTask: AgentTask = { id: '4', label: 'Optimizing and Compiling...', status: 'running', type: 'compile' };
      setAgentTasks(prev => [...prev, compileTask]);
      await new Promise(r => setTimeout(r, 500));
      setAgentTasks(prev => prev.map(t => t.id === '4' ? { ...t, status: 'success' } : t));

      streamCancelRef.current?.();
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
            changedFiles: [
              {
                path: PREVIEW_ENTRY,
                original: originalCode,
                current: updatedCode,
              },
            ],
            durationMs: Date.now() - startTime,
          };

          // Refresh credits after generation
          if (user) {
            getMe({ userId: user.id, email: user.email }).then(data => setCredits(data.credits));
          }

          setMessages((prev) => [...prev, huggyMsg]);
          setStreamingMessage('');
          setIsGenerating(false);
          setAgentTasks([]);
          setTerminalTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId
                ? {
                    ...t,
                    lines: [
                      ...t.lines,
                      `[HUGGY] Tâche terminée : ${newUserMsg.text.substring(0, 40)}…`,
                      '[HUGGY] Build OK — aperçu mis à jour.',
                    ],
                  }
                : t,
            ),
          );
        },
      );
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
      showToast('Ouverture du portail Stripe...', 'info');
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error || 'Erreur Stripe', 'info');
    } catch(e) { showToast('Erreur serveur', 'info'); }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!studioMode ? (
        <motion.div
          key="landing"
          className="min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <LandingPage
            accent={ACCENT_COLORS[activeAccentColor]}
            onOpenStudio={(initialPrompt) => {
              if (initialPrompt) setInputValue(initialPrompt);
              setStudioMode(true);
              if (!new URLSearchParams(window.location.search).get('project')) {
                window.history.replaceState(
                  {},
                  '',
                  `${window.location.pathname}?studio=1`,
                );
              }
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="studio"
          className={`flex flex-col h-screen bg-[#F8F9FB] text-slate-900 font-sans overflow-hidden ${activeAccentColor}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[200] px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]"
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'} animate-pulse`} />
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm relative pointer-events-auto">
              <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-900" onClick={() => setShowAuthModal(false)}>✕</button>
              <h2 className="text-xl font-bold mb-4">{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
              <p className="text-sm text-slate-500 mb-4">Connectez-vous pour utiliser l'IA Huggy.</p>
              <input type="email" placeholder="Email" className="w-full mb-3 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              <input type="password" placeholder="Mot de passe" className="w-full mb-4 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={authPass} onChange={e => setAuthPass(e.target.value)} />
              <button 
                className={`w-full mb-3 text-white font-bold py-3 rounded-lg transition-transform active:scale-95 ${ACCENT_COLORS[activeAccentColor].bg}`}
                onClick={async () => {
                  const res = authMode === 'login' ? await signIn(authEmail, authPass) : await signUp(authEmail, authPass);
                  if (res?.error) showToast(res.error, 'info');
                  else { setShowAuthModal(false); showToast('Succès', 'success'); }
                }}
              >
                {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
              <button className="text-sm text-slate-500 hover:text-slate-900 underline w-full text-center" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                {authMode === 'login' ? 'Pas de compte ? Inscrivez-vous' : 'Déjà un compte ? Connectez-vous'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 flex items-center justify-between px-4 z-10 shrink-0 transition-shadow duration-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              setStudioMode(false);
              window.history.replaceState({}, '', window.location.pathname);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-200 shrink-0"
          >
            <Home size={14} className="text-slate-400" aria-hidden />
            <span className="hidden sm:inline">Accueil</span>
          </button>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div className={`w-8 h-8 ${ACCENT_COLORS[activeAccentColor].bg} rounded-lg flex items-center justify-center text-white shadow-lg shrink-0`}>
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-black tracking-tighter text-slate-900 truncate">HUGGY</span>
            <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-full uppercase tracking-widest shrink-0">Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 mr-0 sm:mr-1">
            <a
              href="https://github.com/Predat1/huggi-v1/blob/main/README.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors duration-200 rounded-lg hover:bg-white/80"
            >
              Docs
            </a>
            <a
              href="mailto:contact@huggy.sbs?subject=Feedback%20Huggy%20Studio"
              className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors duration-200 rounded-lg hover:bg-white/80"
            >
              Feedback
            </a>
          </div>
          {deployments.length > 0 && (
            <button
              type="button"
              onClick={() =>
                window.open(deployments[0].url, '_blank', 'noopener,noreferrer')
              }
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 hover:bg-emerald-100 transition-colors shrink-0"
            >
              <ExternalLink size={14} aria-hidden />
              SaaS en ligne
            </button>
          )}
          <div className="flex items-center gap-2">
            {credits !== null && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credits</span>
                <span className="text-xs font-bold text-slate-700">{credits}</span>
              </div>
            )}
            <button 
              onClick={handleExportZip}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all active:scale-95 border border-slate-200"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export ZIP</span>
            </button>
            <button 
              onClick={handlePublish}
              disabled={isPublishing}
              className={`flex items-center gap-2 px-4 py-2 ${ACCENT_COLORS[activeAccentColor].bg} hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20`}
            >
              <Cloud size={16} className={isPublishing ? 'animate-bounce' : ''} />
              {isPublishing ? 'Publication...' : 'Publier'}
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-[440px]'} border-r border-slate-200 bg-white flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between relative min-h-[57px]">
            {!isSidebarCollapsed && (
              <div 
                onClick={() => setShowProjectMenu(!showProjectMenu)}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors group"
              >
                <div className={`w-4 h-4 ${ACCENT_COLORS[activeAccentColor].bg} rounded-sm`} />
                <span className="font-bold text-sm text-slate-700">New Project</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showProjectMenu ? 'rotate-180' : ''}`} />
              </div>
            )}
            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all ${isSidebarCollapsed ? 'mx-auto' : ''}`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <Plus size={18} /> : <Maximize2 size={16} className="rotate-45" />}
            </button>

            <AnimatePresence>
              {showProjectMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-4 mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50"
                >
                  <button 
                    onClick={handleNewProject}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                  >
                    <Plus size={14} />
                    Start New Project
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-colors">
                    <FolderOpen size={14} />
                    Open Project...
                  </button>
                  <div className="h-[1px] bg-slate-100 my-1" />
                  <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-xs font-bold text-slate-600 transition-colors">
                    <Plus size={14} className="rotate-45" />
                    Delete Project
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3 text-slate-400">
              <button 
                onClick={() => setActiveSidebarTab('chat')}
                className={`p-1.5 rounded transition-colors ${activeSidebarTab === 'chat' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-600'}`}
                title="Chat"
              >
                <MessageSquare size={18} />
              </button>
              <button 
                onClick={() => setActiveSidebarTab('history')}
                className={`p-1.5 rounded transition-colors ${activeSidebarTab === 'history' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-600'}`}
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {messages.length === 0 && !isGenerating && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <Zap size={28} className="text-white" fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700">Huggy Studio</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Décris l'application ou interface que tu veux créer.</p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'VOUS' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${msg.sender === 'VOUS' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                        {msg.sender === 'HUGGY' && (
                          <div className="flex items-center gap-1.5 px-1">
                            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                              <Zap size={9} className="text-white" fill="currentColor" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huggy</span>
                            {msg.durationMs && (
                              <span className="text-[9px] text-slate-300 font-medium">· {(msg.durationMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                        <div className={`rounded-2xl px-5 py-3.5 text-[16px] leading-relaxed ${
                          msg.sender === 'VOUS'
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-sm'
                        }`}>
                          {msg.text}
                        </div>
                        {msg.changedFiles && msg.changedFiles.length > 0 && (
                          <div className="flex items-center gap-2 px-1">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold border border-emerald-100">
                              <FileCode size={9} />
                              {msg.changedFiles.length} fichier(s)
                            </div>
                            <button
                              onClick={() => handleRestore(msg)}
                              disabled={isRestoring}
                              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw size={9} className={isRestoring ? 'animate-spin' : ''} />
                              Restaurer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* ── Streaming / Generating state ── */}
                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] flex flex-col gap-1.5 items-start">
                        <div className="flex items-center gap-1.5 px-1">
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                            <Zap size={9} className="text-white" fill="currentColor" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huggy</span>
                        </div>
                        {/* Tool pills (Collapsible) */}
                        {agentTasks.length > 0 && (
                          <details className="w-full group/details" open={agentTasks.some(t => t.status === 'running')}>
                            <summary className="flex items-center gap-1.5 px-1 py-1 cursor-pointer select-none">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/details:text-slate-600 transition-colors">
                                {agentTasks.filter(t => t.status === 'success').length}/{agentTasks.length} Tâches terminées
                              </span>
                              <ChevronDown size={10} className="text-slate-300 group-open/details:rotate-180 transition-transform" />
                            </summary>
                            <div className="flex flex-col gap-1 w-full mt-1">
                              {agentTasks.map((task) => (
                                <div key={task.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono border ${
                                  task.status === 'running'
                                    ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm'
                                    : task.status === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    task.status === 'running' ? 'bg-amber-400 animate-pulse' : task.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                                  }`} />
                                  {task.type === 'read' ? '◎' : task.type === 'edit' ? '✎' : task.type === 'install' ? '↓' : task.type === 'compile' ? '⚙' : '⚡'} {task.label}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        {/* Streaming text or thinking dots */}
                        {streamingMessage ? (
                          <div className="bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-3.5 text-[16px] leading-relaxed">
                            {streamingMessage}
                            <span className="inline-block w-0.5 h-3.5 bg-slate-400 ml-0.5 align-bottom animate-pulse" />
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-1.5">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Chat Input ── */}
                <div className="shrink-0 p-4 pb-10 bg-[#111215]">
                  <HuggyChatInput
                    onSend={(prompt) => {
                      if (prompt) {
                        setInputValue(prompt);
                        setTimeout(() => handleSendMessage(), 0);
                      }
                    }}
                    isLoading={isGenerating}
                    placeholder="Ask AI anything"
                    modelLabel="Huggy AI"
                  />
                </div>
              </>
            ) : activeSidebarTab === 'history' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timeline</h2>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition-colors">
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                  {messages.filter((m: any) => m.sender === 'VOUS' || m.changedFiles).map((m: any, i: number) => (
                    <div key={m.id} className="relative pl-8 group">
                      <div className={`absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                        m.sender === 'VOUS' ? 'bg-slate-200 text-slate-500' : 'bg-blue-500 text-white'
                      }`}>
                        {m.sender === 'VOUS' ? <Search size={10} /> : <Zap size={10} fill="currentColor" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {m.sender === 'VOUS' ? 'User Request' : 'Agent Action'}
                          </span>
                          <span className="text-[9px] text-slate-300 font-medium">
                            {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium line-clamp-2 group-hover:line-clamp-none transition-all break-words">
                          {m.text}
                        </p>
                        {m.changedFiles && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold border border-emerald-100">
                              <FileCode size={10} />
                              {m.changedFiles.length} file modified
                            </div>
                            <button 
                              onClick={() => handleRestore(m)}
                              disabled={isRestoring}
                              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
                              Restore
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
          {/* Main Toolbar */}
          <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewMode === 'desktop' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white text-slate-500'
                }`}
              >
                <Monitor size={14} />
                Desktop
              </button>
              <button 
                onClick={() => setPreviewMode('tablet')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewMode === 'tablet' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white text-slate-500'
                }`}
              >
                <TabletIcon size={14} />
                Tablet
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewMode === 'mobile' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white text-slate-500'
                }`}
              >
                <Smartphone size={14} />
                Mobile
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => {
                    setIsSaving(true);
                    setTimeout(() => {
                      setIsSaving(false);
                      setLastSaved(new Date());
                      showToast('Preview refreshed', 'success');
                    }, 1000);
                  }}
                  className={`p-1.5 rounded-lg transition-all ${isSaving ? ACCENT_COLORS[activeAccentColor].text + ' bg-white' : 'text-slate-400 hover:text-blue-600 hover:bg-white'}`}
                  title="Rafraîchir l’aperçu Huggy"
                  aria-label="Rafraîchir l’aperçu"
                >
                  <RotateCw size={14} className={isSaving ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                  title="Ouvrir l’aperçu dans un nouvel onglet"
                  aria-label="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="h-6 w-[1px] bg-slate-200 mx-1" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Aperçu — vue principale du rendu live (NEXUS dans Huggy Studio)"
                  aria-label="Aperçu — rendu live"
                  className={`p-2 ${ACCENT_COLORS[activeAccentColor].bg} text-white rounded-lg shadow-lg active:scale-95 transition-transform`}
                >
                  <Monitor size={18} />
                </button>
                
                {/* Cloud Menu */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowCloudMenu(!showCloudMenu)}
                    className={`p-2 rounded-lg transition-colors ${showCloudMenu ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Cloud Huggy — base de données, auth, stockage, backend et déploiement"
                    aria-label="Espace Cloud — infrastructure et données"
                  >
                    <Cloud size={18} />
                  </button>
                  <AnimatePresence>
                    {showCloudMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50"
                      >
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Espace Cloud · Huggy</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                          La partie « serveur + données » de votre app : connectez la base, l’auth et le stockage, vérifiez le backend — sans config serveur lourde.
                        </p>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-3 mb-4">
                          <div className="flex gap-2.5 text-[11px] text-slate-600 leading-snug">
                            <Database size={14} className="shrink-0 text-blue-500 mt-0.5" aria-hidden />
                            <div><span className="font-bold text-slate-700">Base de données</span> — modèles et persistance (PostgreSQL / API projet).</div>
                          </div>
                          <div className="flex gap-2.5 text-[11px] text-slate-600 leading-snug">
                            <Shield size={14} className="shrink-0 text-blue-500 mt-0.5" aria-hidden />
                            <div><span className="font-bold text-slate-700">Authentification</span> — utilisateurs et sessions (à brancher dans le code).</div>
                          </div>
                          <div className="flex gap-2.5 text-[11px] text-slate-600 leading-snug">
                            <HardDrive size={14} className="shrink-0 text-blue-500 mt-0.5" aria-hidden />
                            <div><span className="font-bold text-slate-700">Stockage</span> — fichiers et médias pour votre SaaS.</div>
                          </div>
                          <div className="flex gap-2.5 text-[11px] text-slate-600 leading-snug">
                            <Cloud size={14} className="shrink-0 text-blue-500 mt-0.5" aria-hidden />
                            <div><span className="font-bold text-slate-700">Backend & déploiement</span> — état des déploiements et URL de prod ci-dessous.</div>
                          </div>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historique des déploiements</h4>
                        <div className="space-y-3">
                          {deployments.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">Aucun déploiement pour l’instant.</p>
                          ) : (
                            deployments.map(dep => (
                              <div key={dep.id} className="p-2 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-blue-600 truncate max-w-[120px]">{dep.url}</span>
                                  <span className="text-[9px] text-slate-400">{dep.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Production Huggy</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Palette Menu */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowAnalyticsMenu(false);
                      setShowCloudMenu(false);
                      setShowProjectMenu(false);
                    }}
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors group relative"
                    title="Design — couleurs d’accent, textes visuels et thème Studio (édition visuelle)"
                    aria-label="Design — thème et couleurs"
                  >
                    <Palette size={18} />
                    <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-44 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Design · Huggy</p>
                      <p className="text-[10px] text-slate-400 leading-snug mb-3">Palette d’accent pour l’interface Studio — rapprochez le visuel de votre marque.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>).map(color => (
                          <button 
                            key={color}
                            onClick={() => {
                              setActiveAccentColor(color);
                              showToast(`Theme changed to ${color}`, 'info');
                            }}
                            className={`w-full h-8 rounded-lg ${ACCENT_COLORS[color].bg} border-2 ${activeAccentColor === color ? 'border-slate-900' : 'border-transparent'} transition-all`}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Code — raccourci vers l’éditeur (même onglet Code du bas) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('code');
                    setShowCloudMenu(false);
                    setShowAnalyticsMenu(false);
                    setShowMoreMenu(false);
                    setShowProjectMenu(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${activeBottomTab === 'code' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`}
                  title="Code — fichiers, composants, logique et corrections techniques (Huggy)"
                  aria-label="Code — éditeur de fichiers"
                >
                  <Code2 size={18} />
                </button>

                {/* Analytics Menu */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowAnalyticsMenu(!showAnalyticsMenu)}
                    className={`p-2 rounded-lg transition-colors ${showAnalyticsMenu ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Aperçu & analytique — suivi Huggy, crédits IA et métriques du projet"
                    aria-label="Analytique et suivi du projet"
                  >
                    <BarChart3 size={18} />
                  </button>
                  <AnimatePresence>
                    {showAnalyticsMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50"
                      >
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Aperçu & analytique · Huggy</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                          Tableau de bord orienté usage : testez le rendu, suivez la consommation IA et l’activité sur le projet.
                        </p>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Consommation IA</h5>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              <span>Crédits restants</span>
                              <span className="text-blue-600">619,50 / 1000</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 w-[62%]" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Jetons</p>
                              <p className="text-sm font-black text-slate-700">12,4k</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Requêtes</p>
                              <p className="text-sm font-black text-slate-700">142</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* More Menu */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`p-2 rounded-lg transition-colors ${showMoreMenu ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Plus d’options Huggy — export, paramètres avancés, partage et support"
                    aria-label="Plus d’options"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  <AnimatePresence>
                    {showMoreMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50"
                      >
                        <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projet Huggy</p>
                        <button type="button" onClick={() => { setShowMoreMenu(false); setShowExportModal(true); }} className="w-full flex flex-col items-start gap-0.5 px-3 py-2 hover:bg-slate-50 rounded-lg text-left transition-colors">
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Download size={14} className="shrink-0" aria-hidden />
                            Exporter le code
                          </span>
                          <span className="text-[10px] text-slate-400 pl-[22px]">GitHub ou Archive ZIP</span>
                        </button>
                        <button type="button" onClick={() => { setShowMoreMenu(false); setShowSettingsModal(true); }} className="w-full flex flex-col items-start gap-0.5 px-3 py-2 hover:bg-slate-50 rounded-lg text-left transition-colors">
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Settings size={14} className="shrink-0" aria-hidden />
                            Paramètres du projet
                          </span>
                          <span className="text-[10px] text-slate-400 pl-[22px]">Domaine, secrets et variables</span>
                        </button>
                        <div className="h-[1px] bg-slate-100 my-1" />
                        <button type="button" className="w-full flex flex-col items-start gap-0.5 px-3 py-2 hover:bg-slate-50 rounded-lg text-left transition-colors">
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <MessageSquare size={14} className="shrink-0" aria-hidden />
                            Support Huggy
                          </span>
                          <span className="text-[10px] text-slate-400 pl-[22px]">Aide, retours et questions sur le SaaS</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="h-6 w-[1px] bg-slate-200 mx-1" />
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isTerminalOpen ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white text-slate-500'}`}
                >
                  <TerminalIcon size={14} />
                  Terminal
                </button>
                <button 
                  onClick={() => setActiveBottomTab(activeBottomTab === 'code' ? 'terminal' : 'code')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeBottomTab === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white text-slate-500'}`}
                >
                  <Code2 size={14} />
                  Code
                  <ChevronDown size={14} />
                </button>
                <button className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Preview & Terminal Area */}
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-[#F8F9FB] relative">
            <p className="shrink-0 text-[10px] font-medium leading-relaxed text-slate-400 px-0.5">
              Aperçu live · l’application <span className="font-bold text-slate-500">NEXUS</span> dans le cadre ci-dessous est une{' '}
              <span className="italic">démo simulée</span> générée par Huggy (le SaaS, c’est Huggy — pas NEXUS).
            </p>
            {/* Preview Window */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative min-h-0">
              <motion.div 
                layout
                className={`relative transition-all duration-500 ease-in-out ${getPreviewSize().container} ${getPreviewSize().frame} overflow-hidden bg-white flex flex-col shadow-2xl`}
              >
                {/* Device Camera/Notch simulation for mobile */}
                {previewMode === 'mobile' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                    <div className="w-8 h-1 rounded-full bg-slate-800" />
                  </div>
                )}

                {previewMode === 'desktop' && (
                  <div className="h-10 border-b border-slate-100 flex items-center px-4 gap-4 bg-slate-50/50 shrink-0 z-20">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                      <div className="w-3 h-3 rounded-full bg-green-400/50" />
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-lg h-7 flex items-center gap-2 px-3 text-[11px] text-slate-400 font-mono overflow-hidden whitespace-nowrap">
                      <span className="truncate">nexus.app/preview</span>
                      <span className="shrink-0 text-[9px] font-sans font-semibold text-slate-300 uppercase tracking-tighter">
                        démo
                      </span>
                    </div>
                  </div>
                )}
                
                <div className={`flex-1 ${getPreviewSize().inner} overflow-hidden relative`}>
                  <PreviewContent
                    mode={previewMode}
                    code={filesMap[PREVIEW_ENTRY] ?? DEFAULT_PREVIEW_CODE}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
