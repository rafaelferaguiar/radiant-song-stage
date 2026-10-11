import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Monitor,
  Tv,
  CheckCircle2,
  XCircle,
  Maximize2,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  type DisplayInfo,
  type ScreenStatus,
  getScreenStatus,
  openScreen,
  closeScreen,
  setScreenAssignment,
  getElectronAPI,
  isElectron,
} from "@/lib/screens";
import { toast } from "sonner";

interface DisplayManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisplayManagerModal({ open, onOpenChange }: DisplayManagerModalProps) {
  const [status, setStatus] = useState<ScreenStatus>({
    displays: [],
    projecaoOpen: false,
    palcoOpen: false,
    assignments: { projecao: null, palco: null },
  });
  const [loading, setLoading] = useState(false);

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const data = await getScreenStatus();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    refreshStatus();

    const api = getElectronAPI();
    if (api?.onScreenStatusChange) {
      const cleanup = api.onScreenStatusChange((newStatus: ScreenStatus) => {
        setStatus(newStatus);
      });
      return cleanup;
    }
  }, [open]);

  const handleToggleProjecao = async () => {
    if (status.projecaoOpen) {
      await closeScreen("projecao");
      toast.info("Janela de projeção fechada");
    } else {
      await openScreen("projecao");
      toast.success("Projeção aberta em tela cheia no monitor correto!");
    }
    refreshStatus();
  };

  const handleTogglePalco = async () => {
    if (status.palcoOpen) {
      await closeScreen("palco");
      toast.info("Janela de palco fechada");
    } else {
      await openScreen("palco");
      toast.success("Retorno de palco aberto no monitor correto!");
    }
    refreshStatus();
  };

  const handleSetAssignment = async (type: "projecao" | "palco", value: string) => {
    const displayId = value === "auto" ? null : Number(value);
    await setScreenAssignment(type, displayId);
    toast.success(
      `Destino ${type === "projecao" ? "da Projeção" : "do Palco"} configurado para: ${
        value === "auto" ? "Automático" : `Monitor ${value}`
      }`,
    );
    refreshStatus();
  };

  const displaysCount = status.displays.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 border-border/80 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Monitor className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Gerenciador de Telas e Monitores</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Reconhecimento automático de projetores e monitores adicionais.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={refreshStatus}
              disabled={loading}
              title="Recarregar telas"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        {/* Status de telas detectadas */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between rounded-xl bg-accent/40 border border-border/50 p-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-medium">
                {isElectron()
                  ? `${displaysCount} monitor${displaysCount === 1 ? "" : "es"} detectado${
                      displaysCount === 1 ? "" : "s"
                    }`
                  : "Modo Navegador (Reconhecimento via Electron recomendado)"}
              </span>
            </div>
            <Badge variant={displaysCount > 1 ? "default" : "secondary"}>
              {displaysCount >= 3
                ? "3 Telas: Estúdio + Projeção + Palco"
                : displaysCount === 2
                  ? "2 Telas: Estúdio + Projeção"
                  : "1 Tela: Estúdio"}
            </Badge>
          </div>

          {/* Cards visuais de cada monitor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {status.displays.map((d) => {
              const isProjecao =
                status.assignments.projecao === d.id ||
                (!status.assignments.projecao && !d.isPrimary && d.index === 2);
              const isPalco =
                status.assignments.palco === d.id ||
                (!status.assignments.palco && !d.isPrimary && d.index === 3);

              return (
                <div
                  key={d.id}
                  className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                    d.isPrimary
                      ? "border-primary/40 bg-primary/5"
                      : isProjecao
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : isPalco
                          ? "border-purple-500/40 bg-purple-500/5"
                          : "border-border/60 bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Tv className="size-4 text-muted-foreground" />
                      <span className="font-semibold text-xs text-foreground truncate max-w-[120px]">
                        {d.label}
                      </span>
                    </div>
                    {d.isPrimary && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                        Principal
                      </Badge>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground mb-3 space-y-0.5">
                    <div>
                      Resolução: <span className="font-mono text-foreground">{d.width}x{d.height}</span>
                    </div>
                    <div>
                      Posição: <span className="font-mono text-muted-foreground">x:{d.bounds.x}, y:{d.bounds.y}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-medium">
                      {d.isPrimary ? "🖥️ Estúdio (Controle)" : isProjecao ? "📽️ Projeção" : isPalco ? "🎤 Palco" : "Secundário"}
                    </span>
                    {(isProjecao && status.projecaoOpen) || (isPalco && status.palcoOpen) ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configurações e Ações */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5" /> Controle e Saídas de Vídeo
            </h4>

            {/* Controle da Projeção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Tela de Projeção</span>
                  {status.projecaoOpen ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                      <CheckCircle2 className="size-3 mr-1" /> Aberta (Ao Vivo)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      <XCircle className="size-3 mr-1" /> Fechada
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Exibe letras, versículos, fundos animados e mídias para a congregação.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={status.assignments.projecao ? String(status.assignments.projecao) : "auto"}
                  onValueChange={(val) => handleSetAssignment("projecao", val)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">⚡ Automático</SelectItem>
                    {status.displays.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant={status.projecaoOpen ? "destructive" : "default"}
                  onClick={handleToggleProjecao}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Maximize2 className="size-3.5" />
                  {status.projecaoOpen ? "Fechar" : "Projetar"}
                </Button>
              </div>
            </div>

            {/* Controle do Palco */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Retorno de Palco</span>
                  {status.palcoOpen ? (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                      <CheckCircle2 className="size-3 mr-1" /> Aberto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      <XCircle className="size-3 mr-1" /> Fechado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monitor para os músicos/pregador com relógio, próximo verso e timers.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={status.assignments.palco ? String(status.assignments.palco) : "auto"}
                  onValueChange={(val) => handleSetAssignment("palco", val)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">⚡ Automático</SelectItem>
                    {status.displays.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant={status.palcoOpen ? "destructive" : "secondary"}
                  onClick={handleTogglePalco}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Maximize2 className="size-3.5" />
                  {status.palcoOpen ? "Fechar" : "Abrir Palco"}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/30">
            💡 <strong>Dica:</strong> Em computadores com 2 ou mais telas conectadas, o RFPresenter abre automaticamente a projeção na tela secundária em tela cheia, sem necessidade de arrastar janelas ou pressionar F.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

