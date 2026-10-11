export interface DisplayInfo {
  id: number;
  index: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
  isPrimary: boolean;
  scaleFactor: number;
}

export interface ScreenStatus {
  displays: DisplayInfo[];
  projecaoOpen: boolean;
  palcoOpen: boolean;
  assignments: {
    projecao: number | null;
    palco: number | null;
  };
}

export function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    "electronAPI" in window &&
    (window as any).electronAPI?.isElectron === true
  );
}

export function getElectronAPI() {
  return typeof window !== "undefined" ? (window as any).electronAPI : null;
}

export async function getDisplays(): Promise<DisplayInfo[]> {
  const api = getElectronAPI();
  if (!api?.getDisplays) return [];
  try {
    return await api.getDisplays();
  } catch (err) {
    console.error("Erro ao obter telas:", err);
    return [];
  }
}

export async function getScreenStatus(): Promise<ScreenStatus> {
  const api = getElectronAPI();
  if (!api?.getScreenStatus) {
    return {
      displays: [],
      projecaoOpen: false,
      palcoOpen: false,
      assignments: { projecao: null, palco: null },
    };
  }
  try {
    return await api.getScreenStatus();
  } catch (err) {
    console.error("Erro ao obter status de telas:", err);
    return {
      displays: [],
      projecaoOpen: false,
      palcoOpen: false,
      assignments: { projecao: null, palco: null },
    };
  }
}

export async function openScreen(type: "projecao" | "palco", displayId?: number) {
  const api = getElectronAPI();
  if (api?.openScreenWindow) {
    return await api.openScreenWindow(type, displayId);
  }
  // Fallback para navegador comum: popup window.open
  const path = type === "projecao" ? "/projecao" : "/palco";
  const name = type === "projecao" ? "palco-projecao" : "palco-stage";
  window.open(path, name, "popup=yes,width=1280,height=720,left=100,top=100");
  return { success: true };
}

export async function closeScreen(type: "projecao" | "palco") {
  const api = getElectronAPI();
  if (api?.closeScreenWindow) {
    return await api.closeScreenWindow(type);
  }
  return { success: true };
}

export async function setScreenAssignment(type: "projecao" | "palco", displayId: number | null) {
  const api = getElectronAPI();
  if (api?.setScreenAssignment) {
    return await api.setScreenAssignment(type, displayId);
  }
  return { success: true };
}

