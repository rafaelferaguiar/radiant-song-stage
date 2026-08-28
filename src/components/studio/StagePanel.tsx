import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timer, Play, Pause, RotateCcw, MessageSquare, Eye, EyeOff, Clock, Monitor, Flame } from "lucide-react";
import type { StageState, TimerState } from "@/lib/projection";

interface StagePanelProps {
  stage: StageState;
  onStageChange: (stage: StageState) => void;
  timers: TimerState;
  onTimersChange: (timers: TimerState) => void;
  songKey: string;
  bpm: number | null;
  notes: string;
  onOpenStage: () => void;
}

function updateTimer(timers: TimerState, patch: Partial<TimerState>) {
  return { ...timers, ...patch };
}

function updateStage(stage: StageState, patch: Partial<StageState>) {
  return { ...stage, ...patch };
}

export function StagePanel({
  stage,
  onStageChange,
  timers,
  onTimersChange,
  songKey,
  bpm,
  notes,
  onOpenStage,
}: StagePanelProps) {
  const toggleService = () => {
    if (timers.serviceStartedAt) {
      if (timers.servicePausedAt) {
        const pausedFor = Date.now() - timers.servicePausedAt;
        onTimersChange(updateTimer(timers, { serviceStartedAt: timers.serviceStartedAt + pausedFor, servicePausedAt: null }));
      } else {
        onTimersChange(updateTimer(timers, { servicePausedAt: Date.now() }));
      }
    } else {
      onTimersChange(updateTimer(timers, { serviceStartedAt: Date.now(), servicePausedAt: null }));
    }
  };

  const resetService = () => {
    onTimersChange(updateTimer(timers, { serviceStartedAt: null, servicePausedAt: null }));
  };

  const startItem = () => {
    onTimersChange(updateTimer(timers, { itemStartedAt: Date.now(), itemPausedAt: null }));
  };

  const toggleItem = () => {
    if (!timers.itemStartedAt) return;
    if (timers.itemPausedAt) {
      const pausedFor = Date.now() - timers.itemPausedAt;
      onTimersChange(updateTimer(timers, { itemStartedAt: timers.itemStartedAt + pausedFor, itemPausedAt: null }));
    } else {
      onTimersChange(updateTimer(timers, { itemPausedAt: Date.now() }));
    }
  };

  const resetItem = () => {
    onTimersChange(updateTimer(timers, { itemStartedAt: null, itemDurationMin: null, itemPausedAt: null }));
  };

  const itemDuration = timers.itemDurationMin ?? "";

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
            onChange={(e) => onStageChange(updateStage(stage, { message: e.target.value }))}
            placeholder="Ex: último louvor, hora da oferta"
          />
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Mostrar mensagem</Label>
            <Switch
              checked={stage.showMessage}
              onCheckedChange={(v) => onStageChange(updateStage(stage, { showMessage: v }))}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Piscar (alerta)</Label>
            <Switch
              checked={stage.blink}
              onCheckedChange={(v) => onStageChange(updateStage(stage, { blink: v }))}
            />
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
            <Button variant="ghost" size="icon" onClick={resetService} title="Zerar">
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Timer className="size-3.5" /> Timer do item
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              type="number"
              min={0}
              value={itemDuration}
              onChange={(e) => {
                const v = e.target.value;
                onTimersChange(updateTimer(timers, { itemDurationMin: v ? Number(v) : null }));
              }}
              placeholder="Minutos"
            />
            <span className="flex items-center text-xs text-muted-foreground">min</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={startItem} disabled={!timers.itemDurationMin}>
              <Play className="mr-1 size-4" /> Iniciar item
            </Button>
            <Button variant="secondary" className="flex-1" onClick={toggleItem} disabled={!timers.itemStartedAt}>
              {timers.itemPausedAt ? (
                <>
                  <Play className="mr-1 size-4" /> Continuar
                </>
              ) : (
                <>
                  <Pause className="mr-1 size-4" /> Pausar
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={resetItem} title="Zerar">
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5" /> Informações no palco
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Mostrar observações</Label>
            <Switch
              checked={stage.showNotes}
              onCheckedChange={(v) => onStageChange(updateStage(stage, { showNotes: v }))}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <Label className="text-xs text-muted-foreground">Mostrar timers</Label>
            <Switch
              checked={stage.showTimers}
              onCheckedChange={(v) => onStageChange(updateStage(stage, { showTimers: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
            <div className="rounded bg-muted px-2 py-1.5 text-center">
              <span className="text-[10px] uppercase text-muted-foreground">Tom</span>
              <div className="font-semibold">{songKey || "—"}</div>
            </div>
            <div className="rounded bg-muted px-2 py-1.5 text-center">
              <span className="text-[10px] uppercase text-muted-foreground">BPM</span>
              <div className="font-semibold">{bpm ?? "—"}</div>
            </div>
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
