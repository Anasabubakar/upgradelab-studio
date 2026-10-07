// Mirrors schema/report.v1.schema.json of upgradelab-runner. The precompiled validator is the
// gate; these types only describe what has already passed it.
export type Status = "pass" | "fail" | "inconclusive";
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface Report {
  reportVersion: number;
  kind: string;
  tool: { name: string; runnerVersion: string; sorobanSdk: string; hostProtocol: number; mode: string; authEnforcement: string };
  scenario: { name: string; sha256: string; definition: { description?: string | null; accounts: string[] } & Record<string, unknown> };
  wasm: { old: WasmArtifact; new: WasmArtifact };
  categories: Category[];
  executedOps: ExecutedOp[];
  checkpoints: Record<string, Record<string, ProbeReading>>;
  authChecks: AuthCheck[];
  invariants: InvariantResult[];
  verdict: { status: Status; passed: number; failed: number; inconclusive: number };
  limits: string[];
  network?: { network: string; rpcUrl: string; contractId: string; wasmHashOld: string; wasmHashNew: string; accounts: Record<string, string> } | null;
}

export interface WasmArtifact { path: string; sha256: string; bytes: number }

export interface Category {
  id: string;
  title: string;
  status: string;
  detail: string;
  native?: { logSha256: string; passed: number; failed: number; ignored: number; tests: Array<{ name: string; result: string }> } | null;
}

export interface ErrorInfo { class: string; hostError: string; contractCode?: number | null; message: string }

export interface ExecutedOp {
  seq: number;
  id: string;
  phase: string;
  fn: string;
  args: Array<{ name: string; shape: string; value: Json }>;
  signers: string[];
  outcome: { status: string; shape?: string | null; value?: Json; error?: ErrorInfo | null };
  expectation: string;
  observedAuth: Array<{ address: string; contract: string; fn: string; args: Json[] }>;
  executableAfter?: string | null;
  txHash?: string | null;
}

export interface ProbeReading { ok: boolean; shape?: string | null; value?: Json; error?: string | null }

export interface AuthCheck {
  invariant: string;
  op: string;
  signers: string[];
  signatureScheme: string;
  rejected: boolean;
  errorClass?: string | null;
  executableUnchanged?: boolean | null;
}

export interface InvariantResult {
  id: string;
  title: string;
  kind: string;
  status: Status;
  category: string;
  summary: string;
  evidence: Json;
  builtin: boolean;
}
