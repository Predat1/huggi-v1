export interface StreamEvent {
  type: "text" | "tool_start" | "tool_result" | "done" | "error" | "agent_start" | "agent_done" | "chunk" | "credit_info" | "schema_suggestion";
  delta?: string;
  tool?: string;
  input?: Record<string, unknown>;
  result?: { success: boolean; output?: string; error?: string };
  message?: string;
  agent?: string;
  label?: string;
  content?: string;
  cost?: number;
  sql?: string;
  tables?: string[];
  files?: { path: string; content: string }[];
  reply?: string;
  creditsRemaining?: number;
  upgrade?: boolean;
}
