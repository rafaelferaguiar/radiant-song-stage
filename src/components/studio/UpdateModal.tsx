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
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  RefreshCw,
  DownloadCloud,
  ArrowUpCircle,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import {
  getAppVersion,
  checkForUpdates,
  quitAndInstallUpdate,
  subscribeToUpdater,
  type UpdaterStatus,
} from "@/lib/updater";
import { toast } from "sonner";

interface UpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: UpdaterStatus;
  onStatusChange: (status: UpdaterStatus) => void;
}

export function UpdateModal({
  open,
  onOpenChange,
  status,
  onStatusChange,
}: UpdateModalProps) {
  const [currentVersion, setCurrentVersion] = useState("1.0.0");
  const [isChecking, setIsChecking] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  useEffect(() => {
    getAppVersion().then(setCurrentVersion);
  }, []);

  const handleCheckNow = async () => {
    setIsChecking(true);
    setManualMessage(null);
    onStatusChange({ status: "checking" });

    try {
      const res = await checkForUpdates();
      if (res.isDev) {
        setManualMessage(res.message || "Ambiente de desenvolvimento.");
        onStatusChange({ status: "not-available", version: currentVersion });
        toast.info(res.message || "Modo de desenvolvimento.");
      } else if (res.error) {
        let friendly = res.error;
        if (res.error.includes("404") || res.error.includes("releases.atom")) {
          friendly = "Nenhuma release publicada encontrada no GitHub (ou o repositório é privado). Torne o repositório público e publique a release v1.0.2 com os instaladores para liberar atualizações automáticas.";
        }
        setManualMessage(friendly);
        onStatusChange({ status: "error", error: friendly });
        toast.error("Não foi possível verificar atualizações.");
      } else if (res.success) {
        // Eventos IPC irão atualizar o status (available ou not-available)
      }
    } catch (err: any) {
      setManualMessage("Erro ao buscar atualizações.");
      onStatusChange({ status: "error", error: err?.message || String(err) });
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallNow = () => {
    toast.loading("Reiniciando para aplicar a atualização...");
    quitAndInstallUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/80 bg-zinc-950 text-foreground p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Atualização do Sistema
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                RFPresenter Desktop via GitHub Releases
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Card com Versão Atual */}
          <div className="rounded-xl border border-border/60 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium block">
                  Versão Atual Instalada
                </span>
                <span className="text-xl font-bold font-mono text-zinc-100">
                  v{currentVersion}
                </span>
              </div>
              <div>
                {status.status === "downloaded" ? (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 gap-1 px-2.5 py-1">
                    <ArrowUpCircle className="size-3.5" /> Pronta para instalar
                  </Badge>
                ) : status.status === "downloading" ? (
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 gap-1 px-2.5 py-1 animate-pulse">
                    <DownloadCloud className="size-3.5" /> Baixando {status.percent}%
                  </Badge>
                ) : status.status === "checking" || isChecking ? (
                  <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 gap-1 px-2.5 py-1">
                    <RefreshCw className="size-3.5 animate-spin" /> Verificando...
                  </Badge>
                ) : status.status === "available" ? (
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30 gap-1 px-2.5 py-1">
                    <DownloadCloud className="size-3.5" /> Nova versão v{status.version}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600/15 text-emerald-400 border-emerald-500/20 gap-1 px-2.5 py-1">
                    <CheckCircle2 className="size-3.5" /> Atualizado
                  </Badge>
                )}
              </div>
            </div>

            {/* Progresso de Download se ativo */}
            {status.status === "downloading" && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Baixando instalador...</span>
                  <span className="font-mono font-medium text-foreground">{status.percent}%</span>
                </div>
                <Progress value={status.percent} className="h-2 bg-zinc-800" />
              </div>
            )}

            {/* Mensagem de sucesso para instalar */}
            {status.status === "downloaded" && (
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200">
                    <strong className="block text-emerald-300">Nova versão baixada!</strong>
                    A atualização para a versão {status.version ? `v${status.version}` : ""} foi baixada e está pronta.
                  </div>
                </div>
                <Button
                  onClick={handleInstallNow}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 gap-1.5 shadow-md"
                >
                  <ArrowUpCircle className="size-4" /> Reiniciar e Instalar Agora
                </Button>
              </div>
            )}

            {/* Mensagem de erro se houver */}
            {status.status === "error" && (
              <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg p-2.5">
                <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{status.error}</span>
              </div>
            )}

            {/* Mensagem manual avulsa */}
            {manualMessage && status.status !== "error" && (
              <div className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-800/50 rounded-lg p-2.5">
                <Info className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>{manualMessage}</span>
              </div>
            )}
          </div>

          {/* Informações do Repositório GitHub */}
          <div className="rounded-xl border border-border/40 bg-zinc-900/30 p-3 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300">Canal de Distribuição:</span>
              <span className="font-mono text-zinc-400">GitHub Releases</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300">Repositório:</span>
              <span className="font-mono text-zinc-400">rafaelferaguiar/radiant-song-stage</span>
            </div>
            <div className="pt-1">
              <a
                href="https://github.com/rafaelferaguiar/radiant-song-stage/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium text-xs"
              >
                <span>Ver histórico de versões no GitHub</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCheckNow}
              disabled={isChecking || status.status === "downloading"}
              className="gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Verificando..." : "Verificar Atualizações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
