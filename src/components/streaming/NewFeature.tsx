"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolStatus = "running" | "done" | "error";

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
}

interface StreamMessage {
  role: "user" | "agent";
  text?: string;
  tools?: ToolPill[];
}

type AgentStatus = "idle" | "thinking" | "executing" | "writing" | "done";

export interface StreamEvent {
  type: "text" | "tool_start" | "tool_result" | "done" | "error";
  delta?: string;
  tool?: string;
  input?: Record<string, unknown>;
  result?: { success: boolean; output?: string; error?: string };
  usage?: { input_tokens: number; output_tokens: number };
  message?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, string> = {
  file_read: "◎",
  file_create: "+",
  file_edit: "✎",
  terminal: "$",
  package_install: "↓",
  preview_reload: "↺",
};

function uid() { return Math.random().toString(36).slice(2, 8); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {TOOL_ICONS[pill.name] ?? "•"} {pill.name} · {pill.label}
      </span>
      {pill.durationMs !== undefined && (
        <span style={{ fontSize:10, color:"#888780", flexShrink:0 }}>{pill.durationMs}ms</span>
      )}
    </div>
  );
}

function FileTreeItem({ file, key }: { file: FileNode, key?: string | number }) {
  const dotColor = file.state==="new" ? "#1D9E75" : file.state==="editing" ? "#BA7517" : "#888780";
  const textColor = file.state==="new" ? "#085041" : file.state==="editing" ? "#633806" : "var(--color-text-secondary,#666)";
  const name = file.path.split("/").pop();
  const depth = file.path.split("/").length;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, padding:`4px 12px 4px ${8 + depth * 8}px`, fontSize:11.5, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:textColor, animation:"pillFadeIn .2s ease forwards", borderLeft:file.state!=="done"?`2px solid ${dotColor}`:"2px solid transparent" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:dotColor, flexShrink:0 }} />
      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={file.path}>{name}</span>
    </div>
  );
}

// ─── Phase header (new feature shows "Phase X / N") ──────────────────────────

function PhaseHeader({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", fontSize:11, color:"var(--color-text-tertiary,#999)", fontFamily:"var(--font-mono,'Fira Code',monospace)" }}>
      <span style={{ width:16, height:16, borderRadius:"50%", border:`1.5px solid ${done?"#1D9E75":"#EF9F27"}`, background:done?"#E1F5EE":"#FAEEDA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:done?"#085041":"#633806", flexShrink:0 }}>
        {done ? "✓" : "…"}
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface NewFeatureStreamProps {
  onDone?: (files: FileNode[]) => void;
  initialPrompt?: string;
  streamEvents?: AsyncIterable<StreamEvent>;
}

export function NewFeatureStream({ onDone, initialPrompt, streamEvents }: NewFeatureStreamProps) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [files, setFiles] = useState<FileNode[]>([
    { path:"package.json", state:"done" },
    { path:"tsconfig.json", state:"done" },
    { path:"src/app/layout.tsx", state:"done" },
    { path:"src/app/page.tsx", state:"done" },
  ]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [phases, setPhases] = useState<{ label:string; done:boolean }[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt ?? "Ajoute un système d'authentification avec login/register + session");
  const chatRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    chatRef.current?.scrollTo({ top:chatRef.current.scrollHeight, behavior:"smooth" });
  }, [messages, status]);

  const addTool = useCallback((name: string, label: string): string => {
    const id = uid();
    setMessages((p) => [...p, { role:"agent", tools:[{ id, name, label, status:"running" }] }]);
    return id;
  }, []);

  const completeTool = useCallback((id: string, durationMs: number, success = true) => {
    setMessages((p) => p.map((m) => m.tools ? { ...m, tools:m.tools.map((t) => t.id===id ? { ...t, status:success?"done":"error", durationMs } : t) } : m));
  }, []);

  const addFile = useCallback((path: string, state: "new"|"editing") => {
    setFiles((p) => {
      const exists = p.find((f) => f.path===path);
      if (exists) return p.map((f) => f.path===path ? { ...f, state } : f);
      return [...p, { path, state }];
    });
  }, []);

  const runSimulation = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    setMessages([{ role:"user", text:prompt }]);
    setFiles([
      { path:"package.json", state:"done" },
      { path:"tsconfig.json", state:"done" },
      { path:"src/app/layout.tsx", state:"done" },
      { path:"src/app/page.tsx", state:"done" },
    ]);
    setProgress(0);
    setShowProgress(true);
    setPhases([
      { label:"phase 1 — dépendances", done:false },
      { label:"phase 2 — types & schemas", done:false },
      { label:"phase 3 — services & API", done:false },
      { label:"phase 4 — UI", done:false },
    ]);
    setStatus("thinking");
    await sleep(900);

    // Phase 1 — packages
    setStatus("executing");
    const pkgId = addTool("package_install", "next-auth @auth/prisma-adapter bcryptjs");
    await sleep(2400);
    completeTool(pkgId, 1847);
    setProgress(15);
    setPhases((p) => p.map((ph,i) => i===0 ? { ...ph, done:true } : ph));
    await sleep(150);

    // Phase 2 — types
    const typesId = addTool("file_create", "src/types/auth.ts");
    addFile("src/types/auth.ts", "new");
    await sleep(450);
    completeTool(typesId, 156);
    setProgress(28);

    const schemaId = addTool("file_create", "src/schemas/auth.schema.ts");
    addFile("src/schemas/auth.schema.ts", "new");
    await sleep(380);
    completeTool(schemaId, 134);
    setProgress(38);
    setPhases((p) => p.map((ph,i) => i===1 ? { ...ph, done:true } : ph));
    await sleep(100);

    // Phase 3 — services
    const authLibId = addTool("file_create", "src/lib/auth.ts");
    addFile("src/lib/auth.ts", "new");
    await sleep(700);
    completeTool(authLibId, 234);
    setProgress(48);

    const routeId = addTool("file_create", "src/app/api/auth/[...nextauth]/route.ts");
    addFile("src/app/api/auth/[...nextauth]/route.ts", "new");
    await sleep(600);
    completeTool(routeId, 201);
    setProgress(58);

    const migrateId = addTool("terminal", "bun run db:migrate");
    await sleep(1900);
    completeTool(migrateId, 1203);
    setProgress(68);
    setPhases((p) => p.map((ph,i) => i===2 ? { ...ph, done:true } : ph));
    await sleep(100);

    // Phase 4 — UI
    const loginId = addTool("file_create", "src/app/(auth)/login/page.tsx");
    addFile("src/app/(auth)/login/page.tsx", "new");
    await sleep(1000);
    completeTool(loginId, 389);
    setProgress(76);

    const registerId = addTool("file_create", "src/app/(auth)/register/page.tsx");
    addFile("src/app/(auth)/register/page.tsx", "new");
    await sleep(950);
    completeTool(registerId, 344);
    setProgress(86);

    const formId = addTool("file_create", "src/components/features/AuthForm.tsx");
    addFile("src/components/features/AuthForm.tsx", "new");
    await sleep(1200);
    completeTool(formId, 467);
    setProgress(93);

    const reloadId = addTool("preview_reload", "auth routes ready");
    await sleep(280);
    completeTool(reloadId, 52);
    setProgress(100);
    setPhases((p) => p.map((ph,i) => i===3 ? { ...ph, done:true } : ph));

    // Final text
    setStatus("writing");
    await sleep(300);
    const finalText = "Auth complète avec NextAuth v5. Routes \`/login\` et \`/register\` créées. Session persistée via cookie httpOnly.\n\n⚠ MIGRATION : ajoute \`NEXTAUTH_SECRET\` dans ton \`.env\` avant de tester.";
    let typed = "";
    setMessages((p) => [...p, { role:"agent", text:"" }]);
    for (const char of finalText) {
      typed += char;
      setMessages((p) => { const c=[...p]; c[c.length-1]={ role:"agent", text:typed }; return c; });
      await sleep(32);
    }

    setShowProgress(false);
    setStatus("done");
    setFiles((p) => p.map((f) => ({ ...f, state:"done" })));
    onDone?.(files);
    runningRef.current = false;
  }, [prompt, addTool, completeTool, addFile, files, onDone]);

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
        <div style={{ width:220, borderRight:"0.5px solid var(--color-border-tertiary,#e5e5e5)", background:"var(--color-background-secondary,#f9f9f9)", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
          <div style={{ padding:"10px 12px", borderBottom:"0.5px solid var(--color-border-tertiary,#e5e5e5)", fontSize:11, fontWeight:500, color:"var(--color-text-secondary,#666)", letterSpacing:"0.06em", textTransform:"uppercase" }}>project files</div>

          {/* Phase summary */}
          {phases.length > 0 && (
            <div style={{ padding:"8px 12px", borderBottom:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", flexDirection:"column", gap:4 }}>
              {phases.map((ph, i) => <PhaseHeader key={i} {...ph} />)}
            </div>
          )}

          <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
            {files.map((f) => <FileTreeItem key={f.path} file={f as FileNode} />)}
          </div>
        </div>

        {/* Chat */}
        <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((msg, i) =>
            msg.role==="user" ? (
              <div key={i} style={{ alignSelf:"flex-end", maxWidth:"72%", background:"#E6F1FB", border:"0.5px solid #B5D4F4", borderRadius:"12px 12px 3px 12px", padding:"9px 13px", fontSize:13, color:"#0C447C", lineHeight:1.5, animation:"pillFadeIn .2s ease" }}>{msg.text}</div>
            ) : (
              <div key={i} style={{ alignSelf:"flex-start", maxWidth:"90%", display:"flex", flexDirection:"column", gap:5 }}>
                {msg.tools?.map((pill) => { const pProps: { pill: ToolPill } = { pill }; return <ToolPillView key={pill.id} {...pProps} />; })}
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
          {status==="thinking" && messages.length>0 && (
            <div style={{ alignSelf:"flex-start", display:"flex", gap:5, padding:"10px 13px", background:"var(--color-background-primary,#fff)", border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:"3px 12px 12px 12px" }}>
              {[0,1,2].map((i) => <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:"var(--color-text-tertiary,#aaa)", display:"block", animation:`thinkBounce .8s ${i*.15}s ease infinite` }} />)}
            </div>
          )}
        </div>
      </div>

      {showProgress && (
        <div style={{ padding:"0 16px 6px" }}>
          <div style={{ height:2, background:"var(--color-background-secondary,#f0f0f0)", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"#7F77DD", borderRadius:2, transition:"width .4s ease" }} />
          </div>
        </div>
      )}

      <div style={{ padding:"10px 14px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", gap:8, alignItems:"center" }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key==="Enter" && runSimulation()} disabled={status!=="idle"&&status!=="done"} placeholder="Décris la feature à créer..." style={{ flex:1, height:34, padding:"0 11px", fontSize:13, fontFamily:"inherit", borderRadius:8, border:"0.5px solid var(--color-border-secondary,#ccc)", background:"var(--color-background-primary,#fff)", color:"var(--color-text-primary,#111)", outline:"none" }} />
        <button onClick={runSimulation} disabled={status!=="idle"&&status!=="done"} style={{ height:34, padding:"0 14px", fontSize:12, fontFamily:"inherit", borderRadius:8, border:"0.5px solid var(--color-border-secondary,#ccc)", background:"var(--color-background-primary,#fff)", color:"var(--color-text-primary,#111)", cursor:status!=="idle"&&status!=="done"?"not-allowed":"pointer", opacity:status!=="idle"&&status!=="done"?.4:1 }}>Générer</button>
      </div>

      <div style={{ padding:"5px 14px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", alignItems:"center", gap:7, fontSize:11, color:"var(--color-text-tertiary,#999)" }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:status==="idle"||status==="done"?"#888780":status==="thinking"?"#EF9F27":"#1D9E75", flexShrink:0, animation:status!=="idle"&&status!=="done"?"agentPulse 1.2s ease infinite":"none" }} />
        <span>{{ idle:"prêt", thinking:"analyse en cours...", executing:"exécution...", writing:"rédaction...", done:"terminé" }[status]}</span>
        {status==="done" && <span style={{ marginLeft:"auto", color:"var(--color-text-success,#1D9E75)", fontSize:11 }}>{files.filter(f=>f.path.startsWith("src/")).length} fichiers créés</span>}
      </div>
    </div>
  );
}
