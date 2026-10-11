import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Clock,
  Monitor,
  Flame,
  Plus,
  Trash2,
  FileText,
  LayoutTemplate,
  Send,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { NamedTimer, StageState, TimerState } from "@/lib/projection";
import { createNamedTimer } from "@/lib/projection";

interface StagePanelProps {
  stage: StageState;
  onStageChange: (stage: StageState) => void;
  timers: TimerState;
  onTimersChange: (timers: TimerState) => void;
  notes: string;
  onOpenStage: () => void;
  onOpenLayoutEditor?: () => void;
}

const QUICK_MESSAGES = [
  "Último louvor",
  "Hora da oferta",
  "Atenção palco",
  "Tempo esgotado",
  "Microfone mudo",
  "Aumentar retorno",
];

export function StagePanel({
  stage,
  onStageChange,
  timers,
  onTimersChange,
  notes,
  onOpenStage,
  onOpenLayoutEditor,
}: StagePanelProps) {
  const [msgInput, setMsgInput] = useState(stage.message || "");

  const setStage = (patch: Partial<StageState>) => onStageChange({ ...stage, ...patch });
  const setTimers = (patch: Partial<TimerState>) => onTimersChange({ ...timers, ...patch });

  const patchItem = (id: string, patch: Partial<NamedTimer>) =>
    setTimers({ items: timers.items.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const toggleService = () => {
    if (timers.serviceStartedAt) {
      if (timers.servicePausedAt) {
        const pausedFor = Date.now() - timers.servicePausedAt;
        setTimers({ serviceStartedAt: timers.serviceStartedAt + pausedFor, servicePausedAt: null });
      } else {
        setTimers({ servicePausedAt: Date.now() });
      }
    } else {
      setTimers({ serviceStartedAt: Date.now(), servicePausedAt: null });
    }
  };

  const toggleItem = (t: NamedTimer) => {
    if (!t.startedAt) {
      patchItem(t.id, { startedAt: Date.now(), pausedAt: null });
      return;
    }
    if (t.pausedAt) {
      const pausedFor = Date.now() - t.pausedAt;
      patchItem(t.id, { startedAt: t.startedAt + pausedFor, pausedAt: null });
    } else {
      patchItem(t.id, { pausedAt: Date.now() });
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? msgInput).trim();
    if (!text) {
      toast.warning("Digite uma mensagem antes de enviar ao palco");
      return;
    }
    setStage({ message: text, showMessage: true });
    toast.success("Mensagem enviada e exibida no retorno de palco!");
  };

  const handleHideMessage = () => {
    setStage({ showMessage: false });
    toast.info("Mensagem ocultada do retorno de palco");
  };

  const handleClearMessage = () => {
    setMsgInput("");
    setStage({ message: "", showMessage: false });
  };

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-5 pb-6">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onOpenStage}>
            <Monitor className="mr-2 size-4" /> Abrir retorno de palco
          </Button>
          {onOpenLayoutEditor && (
            <Button
              variant="outline"
              size="icon"
              title="Editor visual de layout do palco"
              onClick={onOpenLayoutEditor}
            >
              <LayoutTemplate className="size-4" />
            </Button>
          )}
        </div>

        {/* ── Mensagem de palco ── */}
        <div className="space-y-2.5 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <MessageSquare className="size-3.5 text-red-500" /> Mensagem para o Palco
            </div>
            {stage.showMessage && stage.message && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse">
                <span className="size-1.5 rounded-full bg-red-500" />
                AO VIVO NO PALCO
              </span>
            )}
          </div>

          {/* Banner indicador de mensagem ativa */}
          {stage.showMessage && stage.message && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-400">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-red-300">Exibindo agora:</span>
                  <p className="mt-0.5 font-mono text-sm font-bold uppercase text-white truncate">
                    "{stage.message}"
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={handleHideMessage}
                >
                  <EyeOff className="mr-1 size-3" /> Ocultar
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Digite a mensagem para o palco..."
              className="text-xs"
            />
            <Button
              variant={stage.showMessage ? "secondary" : "default"}
              size="sm"
              className={stage.showMessage ? "" : "bg-red-600 hover:bg-red-700 text-white font-bold"}
              onClick={() => handleSendMessage()}
            >
              <Send className="mr-1 size-3.5" />
              {stage.showMessage ? "Atualizar" : "Enviar"}
            </Button>
          </div>

          {/* Mensagens rápidas */}
          <div className="flex flex-wrap gap-1 pt-1">
            {QUICK_MESSAGES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setMsgInput(preset);
                  handleSendMessage(preset);
                }}
                className="rounded border border-border/40 bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Piscar alerta no palco</Label>
            <Switch
              checked={stage.blink}
              onCheckedChange={(v) => setStage({ blink: v })}
            />
          </div>
        </div>

        {/* ── Timer do culto ── */}
        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" /> Timer do culto
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={toggleService}>
              {timers.serviceStartedAt ? (
                timers.servicePausedAt ? (
                  <>
                    <Play className="mr-1 size-4" /> Continuar
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 size-4" /> Pausar
                  </>
                )
              ) : (
                <>
                  <Play className="mr-1 size-4" /> Iniciar culto
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTimers({ serviceStartedAt: null, servicePausedAt: null })}
              title="Zerar"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Timers personalizados ── */}
        <div className="space-y-3 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Timer className="size-3.5" /> Timers personalizados
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTimers({ items: [...timers.items, createNamedTimer("Pregação", 30)] })}
            >
              <Plus className="mr-1 size-3.5" /> Novo
            </Button>
          </div>

          {timers.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Crie timers com nomes próprios (ex: Pregação, Oferta, Avisos).
            </p>
          ) : null}

          {timers.items.map((t) => (
            <div key={t.id} className="space-y-2 rounded-lg border border-border/60 p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={t.name}
                  onChange={(e) => patchItem(t.id, { name: e.target.value })}
                  placeholder="Nome do timer"
                  className="h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remover"
                  onClick={() => setTimers({ items: timers.items.filter((x) => x.id !== t.id) })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="h-8 w-24"
                  value={t.durationMin ?? ""}
                  onChange={(e) =>
                    patchItem(t.id, { durationMin: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="min"
                />
                <span className="text-xs text-muted-foreground">min</span>
                <Button variant="secondary" size="sm" className="ml-auto" onClick={() => toggleItem(t)}>
                  {t.startedAt && !t.pausedAt ? (
                    <>
                      <Pause className="mr-1 size-3.5" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 size-3.5" /> {t.startedAt ? "Continuar" : "Iniciar"}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Zerar"
                  onClick={() => patchItem(t.id, { startedAt: null, pausedAt: null })}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Texto Grande ── */}
        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileText className="size-3.5" /> Texto Grande (tipo letra)
          </div>
          <textarea
            className="w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={4}
            value={stage.bigText ?? ""}
            onChange={(e) => setStage({ bigText: e.target.value })}
            placeholder={"Ex: O Senhor é meu pastor\nnada me faltará"}
          />
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Exibir texto grande no palco</Label>
            <Switch
              checked={stage.showBigText ?? false}
              onCheckedChange={(v) => setStage({ showBigText: v })}
            />
          </div>
          {stage.showBigText && (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
              ✦ Texto grande ativo — cobre toda a tela do palco
            </div>
          )}
        </div>

        {/* ── Visibilidade de elementos ── */}
        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5" /> O que mostrar no palco
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Relógio</Label>
            <Switch checked={stage.showClock} onCheckedChange={(v) => setStage({ showClock: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Tempo de culto</Label>
            <Switch checked={stage.showService} onCheckedChange={(v) => setStage({ showService: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Timers</Label>
            <Switch checked={stage.showTimers} onCheckedChange={(v) => setStage({ showTimers: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Switch checked={stage.showNotes} onCheckedChange={(v) => setStage({ showNotes: v })} />
          </div>
          {notes ? (
            <div className="rounded bg-muted p-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Observações:</span>
              <p className="mt-1 whitespace-pre-wrap">{notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
}
