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

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, string> = {
  file_read: "◎",
  file_create: "+",
  file_edit: "✎",
  terminal: "$ ",
  package_install: "↓",
  preview_reload: "↺",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "prêt",
  thinking: "analyse en cours...",
  executing: "exécution...",
  writing: "rédaction...",
  done: "terminé",
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  const color =
    status === "idle" || status === "done"
      ? "#888780"
      : status === "thinking"
      ? "#EF9F27"
      : "#1D9E75";

  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        animation:
          status !== "idle" && status !== "done"
            ? "agentPulse 1.2s ease infinite"
            : "none",
        flexShrink: 0,
      }}
    />
  );
}

function ToolPillView({ pill }: { pill: ToolPill }) {
  const isRunning = pill.status === "running";
  const isError = pill.status === "error";

  const bg = isRunning ? "#FAEEDA" : isError ? "#FCEBEB" : "#E1F5EE";
  const borderColor = isRunning ? "#EF9F27" : isError ? "#F09595" : "#9FE1CB";
  const textColor = isRunning ? "#633806" : isError ? "#791F1F" : "#085041";
  const dotColor = isRunning ? "#EF9F27" : isError ? "#E24B4A" : "#1D9E75";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 6,
        background: bg,
        border: `0.5px solid ${borderColor}`,
        fontSize: 11.5,
        fontFamily: "var(--font-mono, 'Fira Code', monospace)",
        color: textColor,
        animation: "pillFadeIn 0.18s ease forwards",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
          animation: isRunning ? "agentPulse 1s ease infinite" : "none",
        }}
      />
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {TOOL_ICONS[pill.name] ?? "•"} {pill.name} · {pill.label}
      </span>
      {pill.durationMs !== undefined && (
        <span style={{ fontSize: 10, color: "#888780", flexShrink: 0 }}>
          {pill.durationMs}ms
        </span>
      )}
    </div>
  );
}

function FileTreeItem({ file }: { file: FileNode }) {
  const dotColor =
    file.state === "new"
      ? "#1D9E75"
      : file.state === "editing"
      ? "#BA7517"
      : "#888780";
  const textColor =
    file.state === "new"
      ? "#085041"
      : file.state === "editing"
      ? "#633806"
      : "var(--color-text-secondary)";
  const name = file.path.split("/").pop();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "4px 12px 4px 24px",
        fontSize: 11.5,
        fontFamily: "var(--font-mono, 'Fira Code', monospace)",
        color: textColor,
        animation: "pillFadeIn 0.2s ease forwards",
        borderLeft: file.state !== "done" ? `2px solid ${dotColor}` : "2px solid transparent",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={file.path}
      >
        {name}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CreateComponentStreamProps {
  /** Called when agent finishes with all created file paths */
  onDone?: (files: FileNode[]) => void;
  /** Override the initial prompt */
  initialPrompt?: string;
  /** Inject real SSE stream events instead of simulation */
  streamEvents?: AsyncIterable<StreamEvent>;
}

// Real SSE event shape (matches your api/agent/route.ts)
export interface StreamEvent {
  type: "text" | "tool_start" | "tool_result" | "done" | "error";
  delta?: string;
  tool?: string;
  input?: Record<string, unknown>;
  result?: { success: boolean; output?: string; error?: string };
  usage?: { input_tokens: number; output_tokens: number };
  message?: string;
}

export function CreateComponentStream({
  onDone,
  initialPrompt,
  streamEvents,
}: CreateComponentStreamProps) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [files, setFiles] = useState<FileNode[]>([
    { path: "package.json", state: "done" },
    { path: "tsconfig.json", state: "done" },
    { path: "src/app/layout.tsx", state: "done" },
  ]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [prompt, setPrompt] = useState(
    initialPrompt ?? "Crée un composant Button avec variantes primary, secondary, danger"
  );
  const chatRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // ── Simulation (no real stream provided) ────────────────────────────────────
  const runSimulation = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    setMessages([{ role: "user", text: prompt }]);
    setFiles([
      { path: "package.json", state: "done" },
      { path: "tsconfig.json", state: "done" },
      { path: "src/app/layout.tsx", state: "done" },
    ]);
    setProgress(0);
    setShowProgress(true);
    setStatus("thinking");

    await sleep(700);

    // Round 1 — file_read
    setStatus("executing");
    const readId = uid();
    setMessages((p) => [
      ...p,
      { role: "agent", tools: [{ id: readId, name: "file_read", label: "src/types/ui.ts", status: "running" }] },
    ]);
    await sleep(350);
    setMessages((p) =>
      p.map((m) =>
        m.tools
          ? { ...m, tools: m.tools.map((t) => (t.id === readId ? { ...t, status: "done", durationMs: 89 } : t)) }
          : m
      )
    );
    setProgress(20);

    // Round 2 — file_create Button.tsx
    await sleep(200);
    const createBtnId = uid();
    setMessages((p) => [
      ...p,
      { role: "agent", tools: [{ id: createBtnId, name: "file_create", label: "src/components/ui/Button.tsx", status: "running" }] },
    ]);
    setFiles((p) => [...p, { path: "src/components/ui/Button.tsx", state: "new" }]);
    await sleep(1100);
    setMessages((p) =>
      p.map((m) =>
        m.tools
          ? { ...m, tools: m.tools.map((t) => (t.id === createBtnId ? { ...t, status: "done", durationMs: 412 } : t)) }
          : m
      )
    );
    setProgress(50);

    // Round 3 — file_create stories
    await sleep(150);
    const storiesId = uid();
    setMessages((p) => [
      ...p,
      { role: "agent", tools: [{ id: storiesId, name: "file_create", label: "src/components/ui/Button.stories.tsx", status: "running" }] },
    ]);
    setFiles((p) => [...p, { path: "src/components/ui/Button.stories.tsx", state: "new" }]);
    await sleep(900);
    setMessages((p) =>
      p.map((m) =>
        m.tools
          ? { ...m, tools: m.tools.map((t) => (t.id === storiesId ? { ...t, status: "done", durationMs: 287 } : t)) }
          : m
      )
    );
    setProgress(80);

    // Round 4 — preview_reload
    await sleep(100);
    const reloadId = uid();
    setMessages((p) => [
      ...p,
      { role: "agent", tools: [{ id: reloadId, name: "preview_reload", label: "components updated", status: "running" }] },
    ]);
    await sleep(250);
    setMessages((p) =>
      p.map((m) =>
        m.tools
          ? { ...m, tools: m.tools.map((t) => (t.id === reloadId ? { ...t, status: "done", durationMs: 44 } : t)) }
          : m
      )
    );
    setProgress(100);

    // Final text
    setStatus("writing");
    await sleep(300);
    const finalText =
      "Composant \`Button\` créé avec 3 variantes (primary, secondary, danger) + tailles sm/md/lg. Accessible : rôle button, focus ring, aria-disabled. Stories incluses pour Storybook.";
    let typed = "";
    setMessages((p) => [...p, { role: "agent", text: "" }]);
    for (const char of finalText) {
      typed += char;
      setMessages((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { role: "agent", text: typed };
        return copy;
      });
      await sleep(28);
    }

    setShowProgress(false);
    setStatus("done");

    const newFiles = [
      { path: "src/components/ui/Button.tsx", state: "done" as const },
      { path: "src/components/ui/Button.stories.tsx", state: "done" as const },
    ];
    setFiles((p) => p.map((f) => (f.state !== "done" ? { ...f, state: "done" } : f)));
    onDone?.(newFiles);
    runningRef.current = false;
  }, [prompt, onDone]);

  // ── Real SSE stream ─────────────────────────────────────────────────────────
  const runRealStream = useCallback(async () => {
    if (!streamEvents || runningRef.current) return;
    runningRef.current = true;
    setStatus("thinking");

    const toolMap = new Map<string, string>(); // tool name → pill id
    let agentText = "";

    for await (const event of streamEvents) {
      if (event.type === "text" && event.delta) {
        agentText += event.delta;
        setStatus("writing");
        setMessages((p) => {
          const last = p[p.length - 1];
          if (last?.role === "agent" && last.tools === undefined) {
            return [...p.slice(0, -1), { role: "agent", text: agentText }];
          }
          return [...p, { role: "agent", text: agentText }];
        });
      } else if (event.type === "tool_start" && event.tool && event.input) {
        setStatus("executing");
        const id = uid();
        toolMap.set(event.tool, id);
        const label =
          (event.input.path as string) ??
          (event.input.command as string) ??
          (event.input.packages as string[])?.join(", ") ??
          event.tool;
        setMessages((p) => [
          ...p,
          { role: "agent", tools: [{ id, name: event.tool!, label, status: "running" }] },
        ]);
        if (event.tool === "file_create" || event.tool === "file_edit") {
          setFiles((p) => {
            const path = event.input!.path as string;
            const exists = p.find((f) => f.path === path);
            if (exists) return p.map((f) => f.path === path ? { ...f, state: event.tool === "file_create" ? "new" : "editing" } : f);
            return [...p, { path, state: event.tool === "file_create" ? "new" : "editing" }];
          });
        }
      } else if (event.type === "tool_result" && event.tool) {
        const id = toolMap.get(event.tool);
        setMessages((p) =>
          p.map((m) =>
            m.tools
              ? { ...m, tools: m.tools.map((t) => t.id === id ? { ...t, status: event.result?.success ? "done" : "error" } : t) }
              : m
          )
        );
        setStatus("thinking");
      } else if (event.type === "done") {
        setStatus("done");
        setShowProgress(false);
        setFiles((p) => p.map((f) => ({ ...f, state: "done" })));
        onDone?.(files);
        runningRef.current = false;
      } else if (event.type === "error") {
        setStatus("idle");
        runningRef.current = false;
      }
    }
  }, [streamEvents, files, onDone]);

  const handleRun = () => {
    if (streamEvents) runRealStream();
    else runSimulation();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        background: "var(--color-background-primary, #fff)",
      }}
    >
      <style>{`
        @keyframes agentPulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes pillFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes thinkBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      `}</style>

      {/* Layout: sidebar + chat */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <div
          style={{
            width: 220,
            borderRight: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
            background: "var(--color-background-secondary, #f9f9f9)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--color-text-secondary, #666)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            project files
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            {files.map((f) => (
              <FileTreeItem key={f.path} file={f} />
            ))}
          </div>
        </div>

        {/* Chat */}
        <div
          ref={chatRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div
                key={i}
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "72%",
                  background: "#E6F1FB",
                  border: "0.5px solid #B5D4F4",
                  borderRadius: "12px 12px 3px 12px",
                  padding: "9px 13px",
                  fontSize: 13,
                  color: "#0C447C",
                  lineHeight: 1.5,
                  animation: "pillFadeIn .2s ease",
                }}
              >
                {msg.text}
              </div>
            ) : (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "90%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                }}
              >
                {msg.tools?.map((pill) => (
                  <ToolPillView key={pill.id} pill={pill} />
                ))}
                {msg.text !== undefined && (
                  <div
                    style={{
                      background: "var(--color-background-primary, #fff)",
                      border: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
                      borderRadius: "3px 12px 12px 12px",
                      padding: "9px 13px",
                      fontSize: 13,
                      color: "var(--color-text-primary, #111)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.text}
                    {status === "writing" && i === messages.length - 1 && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: 13,
                          background: "var(--color-text-primary, #111)",
                          marginLeft: 2,
                          verticalAlign: "text-bottom",
                          animation: "cursorBlink .7s step-end infinite",
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* Thinking dots */}
          {status === "thinking" && messages.length > 0 && (
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                gap: 5,
                padding: "10px 13px",
                background: "var(--color-background-primary, #fff)",
                border: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
                borderRadius: "3px 12px 12px 12px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--color-text-tertiary, #aaa)",
                    display: "block",
                    animation: `thinkBounce .8s ${i * 0.15}s ease infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ padding: "0 16px 6px" }}>
          <div
            style={{
              height: 2,
              background: "var(--color-background-secondary, #f0f0f0)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#7F77DD",
                borderRadius: 2,
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRun()}
          disabled={status !== "idle" && status !== "done"}
          placeholder="Décris le composant à créer..."
          style={{
            flex: 1,
            height: 34,
            padding: "0 11px",
            fontSize: 13,
            fontFamily: "inherit",
            borderRadius: 8,
            border: "0.5px solid var(--color-border-secondary, #ccc)",
            background: "var(--color-background-primary, #fff)",
            color: "var(--color-text-primary, #111)",
            outline: "none",
          }}
        />
        <button
          onClick={handleRun}
          disabled={status !== "idle" && status !== "done"}
          style={{
            height: 34,
            padding: "0 14px",
            fontSize: 12,
            fontFamily: "inherit",
            borderRadius: 8,
            border: "0.5px solid var(--color-border-secondary, #ccc)",
            background: "var(--color-background-primary, #fff)",
            color: "var(--color-text-primary, #111)",
            cursor: status !== "idle" && status !== "done" ? "not-allowed" : "pointer",
            opacity: status !== "idle" && status !== "done" ? 0.4 : 1,
          }}
        >
          Générer
        </button>
      </div>

      {/* Status bar */}
      <div
        style={{
          padding: "5px 14px",
          borderTop: "0.5px solid var(--color-border-tertiary, #e5e5e5)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 11,
          color: "var(--color-text-tertiary, #999)",
        }}
      >
        <StatusDot status={status} />
        <span>{STATUS_LABELS[status]}</span>
      </div>
    </div>
  );
}
