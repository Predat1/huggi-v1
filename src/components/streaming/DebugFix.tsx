"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
  state: "new" | "editing" | "done" | "fixed";
}

interface StreamMessage {
  role: "user" | "agent";
  text?: string;
  tools?: ToolPill[];
  isDiagnosis?: boolean;
  isFixed?: boolean;
}

type AgentStatus = "idle" | "reading" | "diagnosing" | "fixing" | "verifying" | "writing" | "done";

export interface StreamEvent {
  type: "text" | "tool_start" | "tool_result" | "done" | "error";
  delta?: string;
  tool?: string;
  input?: Record<string, unknown>;
  result?: { success: boolean; output?: string; error?: string };
  message?: string;
}

const TOOL_ICONS: Record<string, string> = {
  file_read: "◎", file_create: "+", file_edit: "✎",
  terminal: "$", package_install: "↓", preview_reload: "↺",
};

function uid() { return Math.random().toString(36).slice(2, 8); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Diff viewer ──────────────────────────────────────────────────────────────

const BEFORE_CODE = `async function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(json => {
        setData(json);    // ⚠ called after unmount
        setLoading(false);
      });
  }, [url]);

  return { data, loading };
}`;

const AFTER_CODE = `async function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') throw err;
      });

    return () => controller.abort();
  }, [url]);

  return { data, loading };
}`;

function DiffView({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const beforeLines = BEFORE_CODE.split("\n");
  const afterLines = AFTER_CODE.split("\n");

  // Simplified diff: lines only in after = added, only in before = removed
  const removed = new Set([5, 6, 7, 8]);    // 0-indexed lines removed from before
  const added = new Set([5, 6, 7, 8, 9, 10, 11, 12, 13]); // lines added in after

  return (
    <div style={{ border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:8, overflow:"hidden", fontSize:11, fontFamily:"var(--font-mono,'Fira Code',monospace)", animation:"pillFadeIn .3s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        {/* Before */}
        <div style={{ borderRight:"0.5px solid var(--color-border-tertiary,#e5e5e5)" }}>
          <div style={{ padding:"5px 10px", background:"#FCEBEB", borderBottom:"0.5px solid #F09595", fontSize:10, color:"#A32D2D", fontWeight:500 }}>— avant</div>
          {beforeLines.map((line, i) => (
            <div key={i} style={{ padding:"1px 10px", background:removed.has(i)?"#FCEBEB":"transparent", color:removed.has(i)?"#A32D2D":"var(--color-text-secondary,#666)", whiteSpace:"pre", lineHeight:1.7 }}>
              {removed.has(i) && <span style={{ color:"#E24B4A", marginRight:4 }}>−</span>}
              {line || " "}
            </div>
          ))}
        </div>
        {/* After */}
        <div>
          <div style={{ padding:"5px 10px", background:"#E1F5EE", borderBottom:"0.5px solid #9FE1CB", fontSize:10, color:"#085041", fontWeight:500 }}>+ après</div>
          {afterLines.map((line, i) => (
            <div key={i} style={{ padding:"1px 10px", background:added.has(i)?"#E1F5EE":"transparent", color:added.has(i)?"#085041":"var(--color-text-secondary,#666)", whiteSpace:"pre", lineHeight:1.7 }}>
              {added.has(i) && <span style={{ color:"#1D9E75", marginRight:4 }}>+</span>}
              {line || " "}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Diagnosis card ───────────────────────────────────────────────────────────

function DiagnosisCard({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ background:"#FAEEDA", border:"0.5px solid #EF9F27", borderRadius:8, padding:"10px 13px", fontSize:12, lineHeight:1.6, color:"#412402", animation:"pillFadeIn .25s ease" }}>
      <div style={{ fontWeight:500, marginBottom:4, fontSize:11, letterSpacing:"0.05em", textTransform:"uppercase", color:"#633806" }}>diagnostic</div>
      <div>Pas d'<code style={{ background:"#FAC775", padding:"1px 4px", borderRadius:3 }}>AbortController</code> → le <code style={{ background:"#FAC775", padding:"1px 4px", borderRadius:3 }}>fetch()</code> continue après démontage du composant → <code style={{ background:"#FAC775", padding:"1px 4px", borderRadius:3 }}>setState</code> appelé sur composant mort → warning React + fuite mémoire.</div>
    </div>
  );
}

// ─── Typecheck result ─────────────────────────────────────────────────────────

function TypecheckResult({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ background:"#E1F5EE", border:"0.5px solid #9FE1CB", borderRadius:8, padding:"9px 13px", fontSize:11.5, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:"#085041", animation:"pillFadeIn .25s ease" }}>
      <span style={{ color:"#1D9E75", marginRight:8 }}>✓</span>
      bun run typecheck — 0 errors · 743ms
    </div>
  );
}

// ─── Tool pill ────────────────────────────────────────────────────────────────

function ToolPillView({ pill }: { pill: ToolPill }) {
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

function FileTreeItem({ file }: { file: FileNode }) {
  const dotColor = file.state==="new" ? "#1D9E75" : file.state==="editing"||file.state==="fixed" ? "#BA7517" : "#888780";
  const textColor = file.state==="new" ? "#085041" : file.state==="editing"||file.state==="fixed" ? "#633806" : "var(--color-text-secondary,#666)";
  const name = file.path.split("/").pop();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 12px 4px 24px", fontSize:11.5, fontFamily:"var(--font-mono,'Fira Code',monospace)", color:textColor, animation:"pillFadeIn .2s ease forwards", borderLeft:file.state!=="done"?`2px solid ${dotColor}`:"2px solid transparent" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:dotColor, flexShrink:0 }} />
      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={file.path}>{name}</span>
      {file.state==="fixed" && <span style={{ fontSize:9, background:"#E1F5EE", color:"#085041", border:"0.5px solid #9FE1CB", borderRadius:3, padding:"1px 5px", marginLeft:"auto", flexShrink:0 }}>fixed</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface DebugFixStreamProps {
  onDone?: () => void;
  initialPrompt?: string;
  streamEvents?: AsyncIterable<StreamEvent>;
}

export function DebugFixStream({ onDone, initialPrompt, streamEvents }: DebugFixStreamProps) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [files, setFiles] = useState<FileNode[]>([
    { path:"src/hooks/useFetch.ts", state:"done" },
    { path:"src/app/page.tsx", state:"done" },
  ]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showTypecheck, setShowTypecheck] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt ?? "Mon hook useFetch plante quand le composant est démonté");
  const chatRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    chatRef.current?.scrollTo({ top:chatRef.current.scrollHeight, behavior:"smooth" });
  }, [messages, status, showDiagnosis, showDiff, showTypecheck]);

  const runSimulation = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    setMessages([{ role:"user", text:prompt }]);
    setFiles([
      { path:"src/hooks/useFetch.ts", state:"done" },
      { path:"src/app/page.tsx", state:"done" },
    ]);
    setShowDiagnosis(false);
    setShowDiff(false);
    setShowTypecheck(false);
    setStatus("reading");

    await sleep(500);

    // file_read
    const readId = uid();
    setMessages((p) => [...p, { role:"agent", tools:[{ id:readId, name:"file_read", label:"src/hooks/useFetch.ts", status:"running" }] }]);
    await sleep(250);
    setMessages((p) => p.map((m) => m.tools ? { ...m, tools:m.tools.map((t) => t.id===readId ? { ...t, status:"done", durationMs:67 } : t) } : m));

    // Diagnosis
    setStatus("diagnosing");
    await sleep(600);
    setShowDiagnosis(true);

    // Streaming diagnosis text
    await sleep(300);
    const diagText = "Problème identifié : le fetch() continue après démontage du composant. Pas d'AbortController → setState appelé sur un composant mort → warning React + fuite mémoire.";
    let typed = "";
    setMessages((p) => [...p, { role:"agent", text:"", isDiagnosis:true }]);
    for (const char of diagText) {
      typed += char;
      setMessages((p) => { const c=[...p]; c[c.length-1]={ role:"agent", text:typed, isDiagnosis:true }; return c; });
      await sleep(22);
    }

    // Fix
    await sleep(400);
    setStatus("fixing");
    setFiles((p) => p.map((f) => f.path==="src/hooks/useFetch.ts" ? { ...f, state:"editing" } : f));
    const editId = uid();
    setMessages((p) => [...p, { role:"agent", tools:[{ id:editId, name:"file_edit", label:"src/hooks/useFetch.ts", status:"running" }] }]);
    await sleep(700);
    setMessages((p) => p.map((m) => m.tools ? { ...m, tools:m.tools.map((t) => t.id===editId ? { ...t, status:"done", durationMs:178 } : t) } : m));
    setFiles((p) => p.map((f) => f.path==="src/hooks/useFetch.ts" ? { ...f, state:"fixed" } : f));
    setShowDiff(true);

    // Typecheck
    await sleep(300);
    setStatus("verifying");
    const tcId = uid();
    setMessages((p) => [...p, { role:"agent", tools:[{ id:tcId, name:"terminal", label:"bun run typecheck", status:"running" }] }]);
    await sleep(1000);
    setMessages((p) => p.map((m) => m.tools ? { ...m, tools:m.tools.map((t) => t.id===tcId ? { ...t, status:"done", durationMs:743 } : t) } : m));
    setShowTypecheck(true);

    // Preview reload
    await sleep(200);
    const reloadId = uid();
    setMessages((p) => [...p, { role:"agent", tools:[{ id:reloadId, name:"preview_reload", label:"hook fixed", status:"running" }] }]);
    await sleep(250);
    setMessages((p) => p.map((m) => m.tools ? { ...m, tools:m.tools.map((t) => t.id===reloadId ? { ...t, status:"done", durationMs:41 } : t) } : m));

    // Final text
    setStatus("writing");
    await sleep(300);
    const finalText = "[FIXED] AbortController ajouté avec cleanup dans useEffect. Le signal est passé au fetch() — la requête est annulée proprement au démontage.";
    let typed2 = "";
    setMessages((p) => [...p, { role:"agent", text:"", isFixed:true }]);
    for (const char of finalText) {
      typed2 += char;
      setMessages((p) => { const c=[...p]; c[c.length-1]={ role:"agent", text:typed2, isFixed:true }; return c; });
      await sleep(30);
    }

    setFiles((p) => p.map((f) => ({ ...f, state:"done" })));
    setStatus("done");
    onDone?.();
    runningRef.current = false;
  }, [prompt, onDone]);

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
          <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
            {files.map((f) => <FileTreeItem key={f.path} file={f} />)}
          </div>
          {/* Debug legend */}
          <div style={{ padding:"8px 12px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", flexDirection:"column", gap:5, fontSize:10, color:"var(--color-text-tertiary,#999)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:5, height:5, borderRadius:"50%", background:"#BA7517" }} />en cours d'édition</div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:5, height:5, borderRadius:"50%", background:"#1D9E75" }} />corrigé</div>
          </div>
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
                  <div style={{ background:msg.isFixed?"#E1F5EE":"var(--color-background-primary,#fff)", border:`0.5px solid ${msg.isFixed?"#9FE1CB":"var(--color-border-tertiary,#e5e5e5)"}`, borderRadius:"3px 12px 12px 12px", padding:"9px 13px", fontSize:13, color:msg.isFixed?"#085041":"var(--color-text-primary,#111)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                    {msg.text}
                    {(status==="writing"||status==="diagnosing") && i===messages.length-1 && (
                      <span style={{ display:"inline-block", width:2, height:13, background:msg.isFixed?"#085041":"var(--color-text-primary,#111)", marginLeft:2, verticalAlign:"text-bottom", animation:"cursorBlink .7s step-end infinite" }} />
                    )}
                  </div>
                )}
              </div>
            )
          )}

          <DiagnosisCard visible={showDiagnosis} />
          <DiffView visible={showDiff} />
          <TypecheckResult visible={showTypecheck} />

          {(status==="reading"||status==="diagnosing") && messages.length>0 && !messages[messages.length-1].text && (
            <div style={{ alignSelf:"flex-start", display:"flex", gap:5, padding:"10px 13px", background:"var(--color-background-primary,#fff)", border:"0.5px solid var(--color-border-tertiary,#e5e5e5)", borderRadius:"3px 12px 12px 12px" }}>
              {[0,1,2].map((i) => <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:"var(--color-text-tertiary,#aaa)", display:"block", animation:`thinkBounce .8s ${i*.15}s ease infinite` }} />)}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:"10px 14px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", gap:8, alignItems:"center" }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key==="Enter" && runSimulation()} disabled={status!=="idle"&&status!=="done"} placeholder="Décris le bug à corriger..." style={{ flex:1, height:34, padding:"0 11px", fontSize:13, fontFamily:"inherit", borderRadius:8, border:"0.5px solid var(--color-border-secondary,#ccc)", background:"var(--color-background-primary,#fff)", color:"var(--color-text-primary,#111)", outline:"none" }} />
        <button onClick={runSimulation} disabled={status!=="idle"&&status!=="done"} style={{ height:34, padding:"0 14px", fontSize:12, fontFamily:"inherit", borderRadius:8, border:"0.5px solid var(--color-border-secondary,#ccc)", background:"var(--color-background-primary,#fff)", color:"var(--color-text-primary,#111)", cursor:status!=="idle"&&status!=="done"?"not-allowed":"pointer", opacity:status!=="idle"&&status!=="done"?.4:1 }}>Débugger</button>
      </div>

      <div style={{ padding:"5px 14px", borderTop:"0.5px solid var(--color-border-tertiary,#e5e5e5)", display:"flex", alignItems:"center", gap:7, fontSize:11, color:"var(--color-text-tertiary,#999)" }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:status==="done"?"#1D9E75":status==="idle"?"#888780":"#EF9F27", flexShrink:0, animation:status!=="idle"&&status!=="done"?"agentPulse 1.2s ease infinite":"none" }} />
        <span>{{ idle:"prêt", reading:"lecture du code...", diagnosing:"diagnostic...", fixing:"correction en cours...", verifying:"vérification des types...", writing:"rédaction...", done:"corrigé" }[status]}</span>
      </div>
    </div>
  );
}
