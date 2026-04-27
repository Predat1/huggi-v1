"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { StreamEvent } from "../../types/streaming";

type ToolStatus = "running" | "done" | "error" | "pending" | "success";

interface ToolPill {
  id: string;
  name: string;
  label: string;
  status: ToolStatus;
  durationMs?: number;
}

interface FileNode {
  path: string;
  state: "new" | "editing" | "done";
  category: "config" | "type" | "schema" | "service" | "api" | "hook" | "component" | "page";
}

interface StreamMessage {
  role: "user" | "agent";
  text?: string;
  tools?: ToolPill[];
}

type AgentStatus = "idle" | "planning" | "executing" | "writing" | "done";

const TOOL_ICONS: Record<string, string> = {
  file_read: "◎", file_create: "+", file_edit: "✎",
  terminal: "$", package_install: "↓", preview_reload: "↺",
};

const CATEGORY_COLORS: Record<FileNode["category"], { bg: string; text: string; dot: string }> = {
  config:    { bg:"#F1EFE8", text:"#444441", dot:"#888780" },
  type:      { bg:"#EEEDFE", text:"#3C3489", dot:"#7F77DD" },
  schema:    { bg:"#EEEDFE", text:"#3C3489", dot:"#AFA9EC" },
  service:   { bg:"#E6F1FB", text:"#0C447C", dot:"#378ADD" },
  api:       { bg:"#FAEEDA", text:"#633806", dot:"#EF9F27" },
  hook:      { bg:"#FBEAF0", text:"#72243E", dot:"#D4537E" },
  component: { bg:"#E1F5EE", text:"#085041", dot:"#1D9E75" },
  page:      { bg:"#E1F5EE", text:"#085041", dot:"#5DCAA5" },
};

function uid() { return Math.random().toString(36).slice(2, 8); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Architecture plan card ───────────────────────────────────────────────────

const ARCH_PLAN = [
  { layer: "data",      items: ["prisma schema", "migrations", "seed"] },
  { layer: "types",     items: ["Task", "User", "ApiResponse<T>"] },
  { layer: "services",  items: ["task.service", "user.service"] },
  { layer: "api",       items: ["GET /tasks", "POST /tasks", "PATCH /tasks/:id", "DELETE /tasks/:id"] },
  { layer: "hooks",     items: ["useTasks", "useTask", "useCreateTask"] },
  { layer: "ui",        items: ["TaskList", "TaskForm", "TaskCard", "EmptyState"] },
  { layer: "pages",     items: ["/tasks", "/tasks/new"] },
];

function ArchPlan({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ background:"var(--color-background-secondary,#f9f9f9)", border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:10, padding:"12px 14px", animation:"pillFadeIn .3s ease" }}>
      <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary,#666)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>plan d'architecture</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {ARCH_PLAN.map((row) => (
          <div key={row.layer} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ fontSize:10, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:"var(--color-text-tertiary,#999)", minWidth:70, paddingTop:1 }}>{row.layer}</span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {row.items.map((item) => (
                <span key={item} style={{ fontSize:11, fontFamily:"var(--font-mono,'Fira Code',monospace)", background:"var(--color-background-primary,#fff)", border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:4, padding:"2px 7px", color:"var(--color-text-secondary,#666)" }}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── File tree grouped by category ───────────────────────────────────────────

function FileTreeGrouped({ files }: { files: FileNode[] }) {
  const groups: Partial<Record<FileNode["category"], FileNode[]>> = {};
  for (const f of files) {
    if (!groups[f.category]) groups[f.category] = [];
    groups[f.category]!.push(f);
  }

  return (
    <>
      {(Object.entries(groups) as [FileNode["category"], FileNode[]][]).map(([cat, catFiles]) => (
        <div key={cat}>
          <div style={{ padding:"4px 12px", fontSize:9, fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--color-text-tertiary,#999)" }}>{cat}</div>
          {catFiles.map((f) => {
            const colors = CATEGORY_COLORS[f.category];
            const name = f.path.split("/").pop();
            return (
              <div key={f.path} style={{ display:"flex", alignItems:"center", gap:7, padding:"3px 12px 3px 20px", fontSize:11, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:f.state==="new"?colors.text:"var(--color-text-secondary,#666)", animation:"pillFadeIn .2s ease", borderLeft:f.state==="new"?`2px solid ${colors.dot}`:"2px solid transparent" }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:f.state==="new"?colors.dot:"#888780", flexShrink:0 }} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

// ─── Tool pill ────────────────────────────────────────────────────────────────

function ToolPillView({ pill, key }: { pill: ToolPill, key?: string | number }) {
  const isRunning = pill.status === "running";
  const isError = pill.status === "error";
  const bg = isRunning ? "#FAEEDA" : isError ? "#FCEBEB" : "#E1F5EE";
  const borderColor = isRunning ? "#EF9F27" : isError ? "#F09595" : "#9FE1CB";
  const textColor = isRunning ? "#633806" : isError ? "#791F1F" : "#085041";
  const dotColor = isRunning ? "#EF9F27" : isError ? "#E24B4A" : "#1D9E75";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:6, background:bg, border:`0.5px solid ${borderColor}`, fontSize:11.5, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:textColor, animation:"pillFadeIn .18s ease forwards" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:dotColor, flexShrink:0, animation:isRunning?"agentPulse 1s ease infinite":"none" }} />
      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{TOOL_ICONS[pill.name] ?? "•"} {pill.name} · {pill.label}</span>
      {pill.durationMs !== undefined && <span style={{ fontSize:10, color:"#888780", flexShrink:0 }}>{pill.durationMs}ms</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface FullAppStreamProps {
  onDone?: (files: FileNode[]) => void;
  initialPrompt?: string;
  onSend?: (prompt: string) => Promise<AsyncIterable<StreamEvent> | undefined>;
}

const STEPS: Array<{ name: string; label: string; ms: number; dur: number; file?: { path: string; category: FileNode["category"] } }> = [
  { name:"package_install", label:"@prisma/client prisma zod @tanstack/react-query", ms:3200, dur:2891 },
  { name:"file_create", label:"prisma/schema.prisma", ms:600, dur:198, file:{ path:"prisma/schema.prisma", category:"config" } },
  { name:"terminal", label:"bunx prisma generate", ms:1400, dur:1102 },
  { name:"file_create", label:"src/types/task.ts", ms:400, dur:134, file:{ path:"src/types/task.ts", category:"type" } },
  { name:"file_create", label:"src/schemas/task.schema.ts", ms:400, dur:121, file:{ path:"src/schemas/task.schema.ts", category:"schema" } },
  { name:"file_create", label:"src/services/task.service.ts", ms:800, dur:267, file:{ path:"src/services/task.service.ts", category:"service" } },
  { name:"file_create", label:"src/app/api/tasks/route.ts", ms:700, dur:234, file:{ path:"src/app/api/tasks/route.ts", category:"api" } },
  { name:"file_create", label:"src/app/api/tasks/[id]/route.ts", ms:600, dur:189, file:{ path:"src/app/api/tasks/[id]/route.ts", category:"api" } },
  { name:"file_create", label:"src/hooks/useTasks.ts", ms:700, dur:221, file:{ path:"src/hooks/useTasks.ts", category:"hook" } },
  { name:"file_create", label:"src/components/features/TaskList.tsx", ms:1200, dur:412, file:{ path:"src/components/features/TaskList.tsx", category:"component" } },
  { name:"file_create", label:"src/components/features/TaskForm.tsx", ms:1000, dur:367, file:{ path:"src/components/features/TaskForm.tsx", category:"component" } },
  { name:"file_create", label:"src/app/tasks/page.tsx", ms:700, dur:223, file:{ path:"src/app/tasks/page.tsx", category:"page" } },
  { name:"terminal", label:"bun run db:migrate", ms:1600, dur:1289 },
  { name:"terminal", label:"bun run typecheck", ms:900, dur:712 },
  { name:"preview_reload", label:"full app ready", ms:300, dur:58 },
];

function SchemaSuggestionCard({ sql, tables, applying, onApply, onDismiss }: { sql: string; tables: string[]; applying: boolean; onApply: () => void; onDismiss: () => void }) {
  return (
    <div style={{ background:"#E6F1FB", border:"0.5px solid #378ADD", borderRadius:10, padding:"12px 14px", animation:"pillFadeIn .3s ease", marginTop:10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:500, color:"#0C447C", letterSpacing:"0.06em", textTransform:"uppercase" }}>Schéma de base de données suggéré</div>
        <div style={{ display:"flex", gap:6 }}>
          <button 
            onClick={onApply}
            disabled={applying}
            style={{ fontSize:10, fontWeight:700, background:"#378ADD", color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", opacity:applying?0.6:1 }}
          >
            {applying ? "Application..." : "Appliquer"}
          </button>
          <button 
            onClick={onDismiss}
            style={{ fontSize:10, fontWeight:700, background:"transparent", color:"#378ADD", border:"0.5px solid #378ADD", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}
          >
            Ignorer
          </button>
        </div>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
        {tables.map(t => (
          <span key={t} style={{ fontSize:9, fontWeight:600, background:"#fff", color:"#378ADD", border:"0.5px solid #378ADD", borderRadius:4, padding:"1px 6px" }}>{t}</span>
        ))}
      </div>
      <pre style={{ fontSize:10, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:"#0C447C", background:"rgba(255,255,255,0.5)", padding:10, borderRadius:6, overflowX:"auto", margin:0 }}>{sql}</pre>
    </div>
  );
}

export function FullAppStream({ onDone, initialPrompt, onSend }: FullAppStreamProps) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [showArch, setShowArch] = useState(false);
  const [schemaSuggestion, setSchemaSuggestion] = useState<{ sql: string; tables: string[]; applying: boolean } | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt ?? "Crée une app de gestion de tâches avec DB, API REST et UI complète");
  const chatRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    chatRef.current?.scrollTo({ top:chatRef.current.scrollHeight, behavior:"smooth" });
  }, [messages, status, showArch]);

  const runRealStream = useCallback(async () => {
    if (!onSend || runningRef.current) return;
    runningRef.current = true;
    setStatus("planning");
    setMessages([{ role: "user", text: prompt }]);
    setFiles([]);
    setProgress(0);
    setShowArch(false);

    const streamEvents = await onSend(prompt);
    if (!streamEvents) {
      runningRef.current = false;
      return;
    }

    setShowArch(true);
    setStatus("executing");

    const toolMap = new Map<string, string>();
    let agentText = "";
    let fileCount = 0;

    for await (const event of streamEvents) {
      if ((event.type === "chunk" || event.type === "text") && (event.content || event.delta)) {
        const text = event.content || event.delta || "";
        agentText += text;
        setStatus("writing");
        setMessages((p) => {
          const last = p[p.length - 1];
          if (last?.role === "agent" && last.tools === undefined) {
            return [...p.slice(0, -1), { role: "agent", text: agentText }];
          }
          return [...p, { role: "agent", text: agentText }];
        });
      } else if ((event.type === "tool_start" || event.type === "agent_start") && (event.tool || event.agent)) {
        setStatus("executing");
        const id = event.agent || event.tool || uid();
        const toolName = event.agent || event.tool || "tool";
        toolMap.set(toolName, id);
        
        const label = event.label || 
          (event.input?.path as string) ||
          (event.input?.command as string) ||
          (event.input?.packages as string[])?.join(", ") ||
          toolName;

        setMessages((p) => [
          ...p,
          { role: "agent", tools: [{ id, name: toolName, label, status: "running" }] },
        ]);
        
        // Simuler des fichiers pour le visuel si c'est le codeur
        if (toolName === "coder" || event.tool === "file_create") {
           // On verra plus tard comment extraire les fichiers réels s'ils arrivent progressivement
        }
      } else if ((event.type === "tool_result" || event.type === "agent_done") && (event.tool || event.agent)) {
        const toolName = event.agent || event.tool || "";
        const id = toolMap.get(toolName);
        setMessages((p) =>
          p.map((m) =>
            m.tools
              ? { ...m, tools: m.tools.map((t) => t.id === id ? { ...t, status: "success" } : t) }
              : m
          )
        );
        if (toolName === "pm") setStatus("executing");
      } else if (event.type === "schema_suggestion") {
        setSchemaSuggestion({ sql: event.sql || "", tables: event.tables || [], applying: false });
      } else if (event.type === "done") {
        setProgress(100);
        setStatus("done");
        setFiles((p) => p.map((f) => ({ ...f, state: "done" })));
        
        // Mettre à jour les fichiers réels si présents
        if (event.files) {
          const newFiles: FileNode[] = event.files.map(f => ({
            path: f.path,
            state: "done",
            category: f.path.includes("types") ? "type" : f.path.includes("components") ? "component" : "config"
          }));
          setFiles(newFiles);
          onDone?.(newFiles);
        } else {
          onDone?.(files);
        }
        runningRef.current = false;
      } else if (event.type === "error") {
        setStatus("idle");
        runningRef.current = false;
      }
    }
  }, [onSend, prompt, files, onDone]);

  const handleRun = () => {
    if (onSend) runRealStream();
  };

  const newFileCount = files.filter((f) => f.state === "new").length;
  const totalFileCount = files.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:"var(--font-sans,system-ui,sans-serif)", background:"var(--color-background-primary,#fff)" }}>
      <style>{`
        @keyframes agentPulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes pillFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes thinkBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      `}</style>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:230, borderRight:"0.5px solid var(--color-border-tertiary,#e5e5e5)", background:"var(--color-background-secondary,#f9f9f9)", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
          <div style={{ padding:"10px 12px", borderBottom:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary,#666)", letterSpacing:"0.06em", textTransform:"uppercase" }}>project files</span>
            {totalFileCount > 0 && (
              <span style={{ fontSize:10, background:"#7F77DD", color:"#fff", borderRadius:10, padding:"1px 7px", fontWeight:500 }}>{totalFileCount}</span>
            )}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
            {files.length === 0 ? (
              <div style={{ padding:"16px 12px", fontSize:11, color:"var(--color-text-tertiary,#999)", textAlign:"center" }}>en attente du plan...</div>
            ) : (
              <FileTreeGrouped files={files} />
            )}
          </div>

          {/* Category legend */}
          {totalFileCount > 0 && (
            <div style={{ padding:"8px 12px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", flexDirection:"column", gap:3 }}>
              {(["type","service","api","hook","component","page"] as FileNode["category"][]).map((cat) => {
                const count = files.filter((f) => f.category===cat).length;
                if (!count) return null;
                const colors = CATEGORY_COLORS[cat];
                return (
                  <div key={cat} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"var(--color-text-tertiary,#999)" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:colors.dot }} />
                    <span>{cat}</span>
                    <span style={{ marginLeft:"auto" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat */}
        <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((msg, i) =>
            msg.role==="user" ? (
              <div key={i} style={{ alignSelf:"flex-end", maxWidth:"72%", background:"#E6F1FB", border:"0.5px solid #B5D4F4", borderRadius:"12px 12px 3px 12px", padding:"9px 13px", fontSize:13, color:"#0C447C", lineHeight:1.5, animation:"pillFadeIn .2s ease" }}>{msg.text}</div>
            ) : (
              <div key={i} style={{ alignSelf:"flex-start", maxWidth:"90%", display:"flex", flexDirection:"column", gap:5 }}>
                {msg.tools?.map((pill) => <ToolPillView key={pill.id} pill={pill} />)}
                {msg.text !== undefined && (
                  <div style={{ background:"var(--color-background-primary,#fff)", border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:"3px 12px 12px 12px", padding:"9px 13px", fontSize:13, color:"var(--color-text-primary,#111)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                    {msg.text}
                    {status==="writing" && i===messages.length-1 && (
                      <span style={{ display:"inline-block", width:2, height:13, background:"var(--color-text-primary,#111)", marginLeft:2, verticalAlign:"text-bottom", animation:"cursorBlink .7s step-end infinite" }} />
                    )}
                  </div>
                )}
              </div>
            )
          )}

          <ArchPlan visible={showArch} />

          {schemaSuggestion && (
            <SchemaSuggestionCard 
              sql={schemaSuggestion.sql} 
              tables={schemaSuggestion.tables} 
              applying={schemaSuggestion.applying}
              onApply={async () => {
                setSchemaSuggestion(s => s ? { ...s, applying: true } : null);
                // The actual application is handled by the caller or we can pass a callback
                // For now just simulate success
                await sleep(1000);
                setSchemaSuggestion(null);
              }}
              onDismiss={() => setSchemaSuggestion(null)}
            />
          )}

          {status==="planning" && (
            <div style={{ alignSelf:"flex-start", display:"flex", gap:5, padding:"10px 13px", background:"var(--color-background-primary,#fff)", border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:"3px 12px 12px 12px" }}>
              {[0,1,2].map((i) => <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:"var(--color-text-tertiary,#aaa)", display:"block", animation:`thinkBounce .8s ${i*.15}s ease infinite` }} />)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress > 0 && status !== "done" && (
        <div style={{ padding:"0 16px 6px" }}>
          <div style={{ height:2, background:"var(--color-background-secondary,#f0f0f0)", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"#7F77DD", borderRadius:2, transition:"width .4s ease" }} />
          </div>
          {newFileCount > 0 && <div style={{ fontSize:10, color:"var(--color-text-tertiary,#999)", marginTop:4, textAlign:"right" }}>{newFileCount} / {STEPS.filter(s=>s.file).length} fichiers</div>}
        </div>
      )}

      <div style={{ padding:"10px 14px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", gap:8, alignItems:"center" }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key==="Enter" && handleRun()} disabled={status!=="idle"&&status!=="done"} placeholder="Décris l'application à créer..." style={{ flex:1, height:34, padding:"0 11px", fontSize:13, fontFamily:"inherit", borderRadius:8, border:"0.5px solid var(--color-border-secondary,#ccc)", background:"var(--color-background-primary,#fff)", color:"var(--color-text-primary,#111)", outline:"none" }} />
        <button onClick={handleRun} disabled={status!=="idle"&&status!=="done"} style={{ height:34, padding:"0 14px", fontSize:12, fontFamily:"inherit", borderRadius:8, border:"0.5px solid var(--color-border-secondary,#ccc)", background:"var(--color-background-primary,#fff)", color:"var(--color-text-primary,#111)", cursor:status!=="idle"&&status!=="done"?"not-allowed":"pointer", opacity:status!=="idle"&&status!=="done"?.4:1 }}>Générer</button>
      </div>

      <div style={{ padding:"5px 14px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", alignItems:"center", gap:7, fontSize:11, color:"var(--color-text-tertiary,#999)" }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:status==="done"?"#1D9E75":status==="idle"?"#888780":"#7F77DD", flexShrink:0, animation:status!=="idle"&&status!=="done"?"agentPulse 1.2s ease infinite":"none" }} />
        <span>{{ idle:"prêt", planning:"planification...", executing:"génération en cours...", writing:"rédaction...", done:"app générée" }[status]}</span>
        {status==="done" && <span style={{ marginLeft:"auto", color:"#1D9E75", fontSize:11 }}>{totalFileCount} fichiers · prêt à tester</span>}
      </div>
    </div>
  );
}
