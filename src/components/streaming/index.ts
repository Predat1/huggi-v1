// src/components/streaming/index.ts
// Barrel export — import everything from here

export { CreateComponentStream } from "./CreateComponent";
export { NewFeatureStream } from "./NewFeature";
export { DebugFixStream } from "./DebugFix";
export { FullAppStream } from "./FullApp";

// Shared StreamEvent type (same shape as api/agent/route.ts SSE output)
export type { StreamEvent } from "./CreateComponent";
