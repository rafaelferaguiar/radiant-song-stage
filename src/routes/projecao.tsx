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

  useEffect(() => {
    setState(readLiveState());
    const unsubscribe = subscribeLiveState((next) =>
      setState((prev) => (prev.freeze && next.freeze ? { ...next, slide: prev.slide } : next)),
    );
    return () => {
      unsubscribe();
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
    </div>
  );
}
