/**
 * StageLayoutEditor — Editor visual de layout do palco estilo OBS
 *
 * Permite ao operador posicionar widgets (timer, relógio, slide atual, etc.)
 * via drag-and-drop em um canvas proporcional, com handles de redimensionamento.
 * O layout é salvo no LiveState e o retorno de palco o usa automaticamente.
 */

import { useCallback, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Clock,
  FileText,
  GripVertical,
  Layers,
  Maximize2,
  MessageSquare,
  Monitor,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { StageWidget } from "@/lib/projection";
import { cn } from "@/lib/utils";

// ─── Widget catalog ─────────────────────────────────────────────────────────

interface WidgetDef {
  kind: StageWidget["kind"];
  label: string;
  icon: any;
  defaultW: number;
  defaultH: number;
  color: string;
}

const WIDGET_CATALOG: WidgetDef[] = [
  { kind: "clock",       label: "Relógio",         icon: Clock,         defaultW: 25, defaultH: 12, color: "#3b82f6" },
  { kind: "service",     label: "Timer do culto",  icon: Timer,         defaultW: 25, defaultH: 12, color: "#8b5cf6" },
  { kind: "timer",       label: "Timer nomeado",   icon: Timer,         defaultW: 50, defaultH: 18, color: "#f59e0b" },
  { kind: "slide",       label: "Slide atual",     icon: Monitor,       defaultW: 60, defaultH: 50, color: "#10b981" },
  { kind: "nextSection", label: "Próxima parte",   icon: Play,          defaultW: 40, defaultH: 50, color: "#6366f1" },
  { kind: "message",     label: "Mensagem",        icon: MessageSquare, defaultW: 100, defaultH: 10, color: "#ef4444" },
  { kind: "notes",       label: "Observações",     icon: FileText,      defaultW: 50, defaultH: 15, color: "#64748b" },
  { kind: "bigText",     label: "Texto grande",    icon: ArrowLeftRight, defaultW: 100, defaultH: 100, color: "#ec4899" },
];

// ─── Default layout preset ─────────────────────────────────────────────────

export const DEFAULT_STAGE_LAYOUT: StageWidget[] = [
  { id: "w-clock",        kind: "clock",        x: 1,  y: 1,  w: 22, h: 12, scale: 1 },
  { id: "w-service",      kind: "service",      x: 25, y: 1,  w: 25, h: 12, scale: 1 },
  { id: "w-notes",        kind: "notes",        x: 52, y: 1,  w: 47, h: 12, scale: 1 },
  { id: "w-slide",        kind: "slide",        x: 1,  y: 15, w: 58, h: 68, scale: 1 },
  { id: "w-nextSection",  kind: "nextSection",  x: 61, y: 15, w: 38, h: 68, scale: 1 },
  { id: "w-timers",       kind: "timer",        x: 1,  y: 85, w: 98, h: 14, scale: 1 },
  { id: "w-message",      kind: "message",      x: 0,  y: 0,  w: 100, h: 12, scale: 1 },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface StageLayoutEditorProps {
  layout: StageWidget[];
  onChange: (layout: StageWidget[]) => void;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function normalizeWidget(widget: StageWidget): StageWidget {
  const w = clamp(Number.isFinite(widget.w) ? widget.w : 25, 5, 100);
  const h = clamp(Number.isFinite(widget.h) ? widget.h : 15, 5, 100);
  return {
    ...widget,
    w,
    h,
    x: clamp(Number.isFinite(widget.x) ? widget.x : 0, 0, 100 - w),
    y: clamp(Number.isFinite(widget.y) ? widget.y : 0, 0, 100 - h),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StageLayoutEditor({ layout, onChange, onClose }: StageLayoutEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const dragging = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    mode: "move" | "resize";
  } | null>(null);

  const patch = useCallback(
    (id: string, p: Partial<StageWidget>) =>
      onChange(layout.map((w) => (w.id === id ? normalizeWidget({ ...w, ...p }) : w))),
    [layout, onChange],
  );

  const setLayerPosition = (id: string, targetIndex: number) => {
    const currentIndex = layout.findIndex((widget) => widget.id === id);
    if (currentIndex < 0) return;
    const next = [...layout];
    const [widget] = next.splice(currentIndex, 1);
    if (!widget) return;
    next.splice(clamp(targetIndex, 0, next.length), 0, widget);
    onChange(next);
  };

  const moveLayerUp = (id: string) => {
    const currentIndex = layout.findIndex((widget) => widget.id === id);
    if (currentIndex >= 0 && currentIndex < layout.length - 1) {
      setLayerPosition(id, currentIndex + 1);
    }
  };

  const moveLayerDown = (id: string) => {
    const currentIndex = layout.findIndex((widget) => widget.id === id);
    if (currentIndex > 0) {
      setLayerPosition(id, currentIndex - 1);
    }
  };

  const bringToFront = (id: string) => setLayerPosition(id, layout.length - 1);
  const sendToBack = (id: string) => setLayerPosition(id, 0);

  const handleLayerDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedLayerId(id);
  };

  const handleLayerDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverLayerId !== id) {
      setDragOverLayerId(id);
    }
  };

  const handleLayerDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedLayerId;
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = layout.findIndex((w) => w.id === sourceId);
    const targetIndex = layout.findIndex((w) => w.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...layout];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  const remove = (id: string) => {
    onChange(layout.filter((w) => w.id !== id));
    if (selected === id) setSelected(null);
  };

  const addWidget = (def: WidgetDef) => {
    const newWidget: StageWidget = {
      id: `w-${Math.random().toString(36).slice(2, 9)}`,
      kind: def.kind,
      label: def.label,
      x: 10,
      y: 10,
      w: def.defaultW,
      h: def.defaultH,
      scale: 1,
    };
    onChange([...layout, newWidget]);
    setSelected(newWidget.id);
  };

  // ── Mouse drag logic ─────────────────────────────────────────────────────

  const startDrag = (e: React.MouseEvent, id: string, mode: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    const widget = layout.find((w) => w.id === id);
    if (!widget) return;
    setSelected(id);
    dragging.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: widget.x,
      startY: widget.y,
      startW: widget.w,
      startH: widget.h,
      mode,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - dragging.current.startMouseX) / rect.width) * 100;
      const dy = ((ev.clientY - dragging.current.startMouseY) / rect.height) * 100;
      if (dragging.current.mode === "move") {
        const newX = clamp(dragging.current.startX + dx, 0, 100 - dragging.current.startW);
        const newY = clamp(dragging.current.startY + dy, 0, 100 - dragging.current.startH);
        const round = ev.altKey ? (value: number) => Math.round(value * 10) / 10 : Math.round;
        patch(dragging.current.id, { x: round(newX), y: round(newY) });
      } else {
        const newW = clamp(dragging.current.startW + dx, 5, 100 - dragging.current.startX);
        const newH = clamp(dragging.current.startH + dy, 5, 100 - dragging.current.startY);
        const round = ev.altKey ? (value: number) => Math.round(value * 10) / 10 : Math.round;
        patch(dragging.current.id, { w: round(newW), h: round(newH) });
      }
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const selectedWidget = layout.find((w) => w.id === selected) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#06080d]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#0c0f18] px-5 py-3">
        <div className="flex items-center gap-3">
          <Monitor className="size-5 text-primary" />
          <div>
            <h1 className="text-sm font-bold text-white">Editor de Layout do Palco</h1>
            <p className="text-[11px] text-white/40">Organize, sobreponha e ajuste os widgets que aparecem no retorno</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_STAGE_LAYOUT)}
            title="Restaurar layout padrão"
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Padrão
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { onChange([]); onClose(); }}
            title="Remover layout customizado e voltar ao padrão"
          >
            Remover layout
          </Button>
          <Button variant="default" size="sm" onClick={onClose}>
            <X className="mr-1.5 size-3.5" /> Fechar editor
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left: Widget catalog */}
        <aside className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 bg-[#0c0f18] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Adicionar widget</p>
          {WIDGET_CATALOG.map((def) => {
            const Icon = def.icon;
            return (
              <button
                key={def.kind}
                onClick={() => addWidget(def)}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-white/80 transition-colors hover:border-white/20 hover:bg-white/10 active:scale-95"
              >
                <Icon className="size-3.5 shrink-0" style={{ color: def.color }} />
                {def.label}
                <Plus className="ml-auto size-3 text-white/30" />
              </button>
            );
          })}

          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              <Layers className="size-3" /> Camadas do palco
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-white/30">O topo da lista fica na frente; as demais ficam atrás.</p>
            <div className="space-y-1">
              {[...layout].reverse().map((widget, reverseIndex) => {
                const index = layout.length - reverseIndex - 1;
                const def = WIDGET_CATALOG.find((item) => item.kind === widget.kind);
                const Icon = def?.icon ?? Monitor;
                const isSelected = selected === widget.id;
                const isDragOver = dragOverLayerId === widget.id;
                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => handleLayerDragStart(e, widget.id)}
                    onDragOver={(e) => handleLayerDragOver(e, widget.id)}
                    onDragEnd={() => { setDraggedLayerId(null); setDragOverLayerId(null); }}
                    onDrop={(e) => handleLayerDrop(e, widget.id)}
                    onClick={() => setSelected(widget.id)}
                    className={cn(
                      "group flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] transition-all cursor-grab active:cursor-grabbing select-none",
                      isSelected
                        ? "border-primary/70 bg-primary/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/90",
                      isDragOver && "border-primary ring-2 ring-primary/50 bg-primary/20",
                    )}
                  >
                    <GripVertical className="size-3.5 shrink-0 text-white/30 group-hover:text-white/70" />
                    <Icon className="size-3 shrink-0" style={{ color: def?.color }} />
                    <span className="min-w-0 flex-1 truncate font-medium">{widget.label ?? def?.label ?? widget.kind}</span>
                    <span className="shrink-0 text-[9px] text-white/30 group-hover:hidden">
                      {index === layout.length - 1 ? "frente" : index === 0 ? "fundo" : `nível ${index + 1}`}
                    </span>
                    {/* Botões rápidos de subir/descer camada */}
                    <div className="hidden items-center gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        title="Subir 1 nível (para frente)"
                        disabled={index === layout.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveLayerUp(widget.id); }}
                        className="rounded p-0.5 text-white/50 hover:bg-white/20 hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        title="Descer 1 nível (para trás)"
                        disabled={index === 0}
                        onClick={(e) => { e.stopPropagation(); moveLayerDown(widget.id); }}
                        className="rounded p-0.5 text-white/50 hover:bg-white/20 hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: Canvas preview */}
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-[#06080d] p-4">
          <p className="text-[11px] text-white/30">Tela do palco (16:9) — arraste para mover, canto para redimensionar · Alt = ajuste fino</p>
          {/* 16:9 Canvas */}
          <div
            ref={canvasRef}
            className="relative w-full max-w-4xl cursor-default select-none overflow-hidden rounded-xl border border-white/10 shadow-2xl"
            style={{ aspectRatio: "16 / 9", background: "linear-gradient(135deg, #0a0c12 0%, #0f1320 100%)" }}
            onClick={() => setSelected(null)}
          >
            {/* Grid guide */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-5" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="10%" height="10%" patternUnits="objectBoundingBox">
                  <path d="M 0 0 L 0 100 M 0 0 L 100 0" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {layout.map((widget, index) => {
              const def = WIDGET_CATALOG.find((d) => d.kind === widget.kind);
              const isSelected = selected === widget.id;
              const Icon = def?.icon ?? Monitor;

              return (
                <div
                  key={widget.id}
                  className={cn(
                    "absolute flex flex-col overflow-hidden rounded-md border transition-all",
                    isSelected
                      ? "border-white/50 ring-2 ring-white/30"
                      : "border-white/15 hover:border-white/30",
                  )}
                  style={{
                    left: `${widget.x}%`,
                    top: `${widget.y}%`,
                    width: `${widget.w}%`,
                    height: `${widget.h}%`,
                    backgroundColor: `${def?.color ?? "#334155"}22`,
                    cursor: "grab",
                    zIndex: isSelected ? layout.length + 1 : index + 1,
                  }}
                  onMouseDown={(e) => startDrag(e, widget.id, "move")}
                  onClick={(e) => { e.stopPropagation(); setSelected(widget.id); }}
                >
                  {/* Widget label bar */}
                  <div
                    className="flex shrink-0 items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-medium leading-tight"
                    style={{ backgroundColor: `${def?.color ?? "#334155"}55`, color: def?.color ?? "#fff" }}
                  >
                    <Icon className="size-2.5 shrink-0" />
                    <span className="truncate">{widget.label ?? def?.label ?? widget.kind}</span>
                    {isSelected && (
                      <button
                        className="ml-auto rounded p-0.5 opacity-70 hover:opacity-100"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); remove(widget.id); }}
                      >
                        <Trash2 className="size-2.5" style={{ color: "#ef4444" }} />
                      </button>
                    )}
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 flex size-4 items-center justify-center opacity-60 hover:opacity-100"
                    style={{ cursor: "se-resize" }}
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, widget.id, "resize"); }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Maximize2 className="size-2.5 text-white/60" />
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Right: Properties panel */}
        <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#0c0f18] p-3">
          {selectedWidget ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">Propriedades</p>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/70">
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-white/40">Rótulo</Label>
                <Input
                  className="h-7 text-xs"
                  value={selectedWidget.label ?? ""}
                  onChange={(e) => patch(selectedWidget.id, { label: e.target.value })}
                  placeholder={WIDGET_CATALOG.find((d) => d.kind === selectedWidget.kind)?.label}
                />
              </div>

              <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  <Layers className="size-3" /> Camada & Ordem
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-white/35">
                  Posição {layout.findIndex((widget) => widget.id === selectedWidget.id) + 1} de {layout.length}. As camadas superiores cobrem as inferiores.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-1.5 text-[10px]"
                    disabled={layout.findIndex((widget) => widget.id === selectedWidget.id) <= 0}
                    onClick={() => moveLayerDown(selectedWidget.id)}
                    title="Descer 1 nível (recuar camada)"
                  >
                    <ArrowDown className="mr-1 size-3" /> Descer 1 nível
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-1.5 text-[10px]"
                    disabled={layout.findIndex((widget) => widget.id === selectedWidget.id) >= layout.length - 1}
                    onClick={() => moveLayerUp(selectedWidget.id)}
                    title="Subir 1 nível (avançar camada)"
                  >
                    <ArrowUp className="mr-1 size-3" /> Subir 1 nível
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
                    disabled={layout.findIndex((widget) => widget.id === selectedWidget.id) === 0}
                    onClick={() => sendToBack(selectedWidget.id)}
                    title="Enviar para o fundo absoluto"
                  >
                    Para o fundo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
                    disabled={layout.findIndex((widget) => widget.id === selectedWidget.id) === layout.length - 1}
                    onClick={() => bringToFront(selectedWidget.id)}
                    title="Trazer para a frente absoluta"
                  >
                    Para a frente
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-white/40">X (%)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Math.round(selectedWidget.x * 10) / 10}
                    onChange={(e) => patch(selectedWidget.id, { x: Number(e.target.value) })}
                    min={0} max={95} step={0.5}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-white/40">Y (%)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Math.round(selectedWidget.y * 10) / 10}
                    onChange={(e) => patch(selectedWidget.id, { y: Number(e.target.value) })}
                    min={0} max={95} step={0.5}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-white/40">Largura (%)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Math.round(selectedWidget.w * 10) / 10}
                    onChange={(e) => patch(selectedWidget.id, { w: Number(e.target.value) })}
                    min={5} max={100} step={0.5}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-white/40">Altura (%)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Math.round(selectedWidget.h * 10) / 10}
                    onChange={(e) => patch(selectedWidget.id, { h: Number(e.target.value) })}
                    min={5} max={100} step={0.5}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>Escala do texto</span>
                  <span>{(selectedWidget.scale ?? 1).toFixed(1)}×</span>
                </div>
                <Slider
                  value={[selectedWidget.scale ?? 1]}
                  min={0.3}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => patch(selectedWidget.id, { scale: v ?? 1 })}
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => remove(selectedWidget.id)}
              >
                <Trash2 className="mr-1.5 size-3.5" /> Remover widget
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <GripVertical className="size-8 text-white/20" />
              <p className="text-xs text-white/30">Clique em um widget para editar suas propriedades</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
