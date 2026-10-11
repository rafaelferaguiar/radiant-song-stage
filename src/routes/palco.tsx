import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LiveState } from "@/lib/projection";
import { readLiveState, subscribeLiveState } from "@/lib/projection";
import { StageDisplay } from "@/components/stage/StageDisplay";

export const Route = createFileRoute("/palco")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Retorno de palco — Palco" },
      { name: "description", content: "Monitor de retorno de palco com slide atual, próximo verso e timers." },
      { property: "og:title", content: "Retorno de palco — Palco" },
      { property: "og:description", content: "Monitor de retorno de palco com slide atual, próximo verso e timers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StagePage,
});

function StagePage() {
  const [state, setState] = useState<LiveState>(readLiveState());
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setState(readLiveState());
    return subscribeLiveState(setState);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(Math.min(w / 1920, h / 1080));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#080a10] flex items-center justify-center select-none">
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <StageDisplay state={state} media={true} />
      </div>
    </div>
  );
}
