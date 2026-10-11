// src/lib/updater.ts

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdaterStatus =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version?: string; releaseDate?: string; releaseNotes?: any }
  | { status: "not-available"; version?: string }
  | { status: "downloading"; percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
  | { status: "downloaded"; version?: string; releaseNotes?: any }
  | { status: "error"; error: string };

export async function getAppVersion(): Promise<string> {
  if (typeof window === "undefined") return "1.0.0";
  const api = (window as any)?.electronAPI;
  if (!api?.getAppVersion) return "1.0.0";
  try {
    return await api.getAppVersion();
  } catch {
    return "1.0.0";
  }
}

export async function checkForUpdates(): Promise<{
  success?: boolean;
  isDev?: boolean;
  message?: string;
  updateInfo?: any;
  error?: string;
}> {
  if (typeof window === "undefined") return { error: "Ambiente sem janela" };
  const api = (window as any)?.electronAPI;
  if (!api?.checkForUpdates) {
    return { isDev: true, message: "Disponível apenas no aplicativo desktop instalado." };
  }
  try {
    return await api.checkForUpdates();
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}

export async function quitAndInstallUpdate(): Promise<void> {
  if (typeof window === "undefined") return;
  const api = (window as any)?.electronAPI;
  if (api?.quitAndInstallUpdate) {
    await api.quitAndInstallUpdate();
  }
}

export function subscribeToUpdater(callback: (status: UpdaterStatus) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const api = (window as any)?.electronAPI;
  if (api?.onUpdaterStatus) {
    return api.onUpdaterStatus(callback);
  }
  return () => {};
}
