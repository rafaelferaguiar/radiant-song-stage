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
} from "lucide-react";
import type { NamedTimer, StageState, TimerState } from "@/lib/projection";
import { createNamedTimer } from "@/lib/projection";

interface StagePanelProps {
  stage: StageState;
  onStageChange: (stage: StageState) => void;
  timers: TimerState;
  onTimersChange: (timers: TimerState) => void;
  notes: string;
  onOpenStage: () => void;
}

export function StagePanel({ stage, onStageChange, timers, onTimersChange, notes, onOpenStage }: StagePanelProps) {
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

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-5 pb-6">
        <Button className="w-full" onClick={onOpenStage}>
          <Monitor className="mr-2 size-4" /> Abrir retorno de palco
        </Button>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MessageSquare className="size-3.5" /> Mensagem de palco
          </div>
          <Input
            value={stage.message}
            onChange={(e) => setStage({ message: e.target.value })}
            placeholder="Ex: último louvor, hora da oferta"
          />
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Mostrar mensagem</Label>
            <Switch checked={stage.showMessage} onCheckedChange={(v) => setStage({ showMessage: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Piscar (alerta)</Label>
            <Switch checked={stage.blink} onCheckedChange={(v) => setStage({ blink: v })} />
          </div>
        </div>

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
