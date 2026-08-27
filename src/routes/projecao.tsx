import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { SlideCanvas } from "@/components/SlideCanvas";
import {
  INITIAL_LIVE_STATE,
  readLiveState,
  subscribeLiveState,
  type LiveState,
} from "@/lib/projection";

export const Route = createFileRoute("/projecao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tela de projeção — Palco" },
      {
        name: "description",
        content: "Janela de saída para o projetor, sincronizada com o console do Palco em tempo real.",
      },
      { property: "og:title", content: "Tela de projeção — Palco" },
      { property: "og:description", content: "Saída de vídeo sincronizada do console de projeção." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectionScreen,
});

function ProjectionScreen() {
  const [state, setState] = useState<LiveState>(INITIAL_LIVE_STATE);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    setState(readLiveState());
    const unsubscribe = subscribeLiveState(setState);
    const timer = window.setTimeout(() => setHint(false), 4000);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <SlideCanvas
        slide={state.slide}
        theme={state.theme}
        blackout={state.blackout}
        showLogo={state.showLogo}
        logoText={state.logoText}
      />
      {hint ? (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs text-white/70">
          Pressione F para tela cheia · arraste esta janela para o projetor
        </p>
      ) : null}
    </div>
  );
}
