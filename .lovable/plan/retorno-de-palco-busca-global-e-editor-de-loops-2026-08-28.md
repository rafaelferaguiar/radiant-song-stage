# Retorno de palco, busca global e editor de loops

Três frentes principais: tela de retorno de palco, busca universal por atalho e um editor de fundos interativos (loops visuais). Também inclui algumas ideias extras para igreja.

## 1. Retorno de palco (`/palco`)

Nova janela/monitor separada da projeção pública, aberta pelo botão "Retorno de palco" no cabeçalho do estúdio. Conteúdo, em layout de alto contraste legível de longe:

- **Slide ao vivo** grande, com o **próximo slide** menor ao lado (ou abaixo, no modo retrato).
- **Timers**: relógio da hora atual + contagem regressiva do item atual do repertório + tempo total decorrido do culto. A regressiva fica verde, amarela nos últimos 2 min e vermelha quando estoura.
- **Mensagem do operador**: campo no estúdio que aparece só no palco (ex.: "encerrar após o refrão"), com destaque piscante opcional.
- **Notas e acordes**: mostra `song_key`, `bpm` e as notas da música/slide atual — nunca vai para a projeção pública.
- Atalho **F** para tela cheia, igual à tela de projeção.

Controles novos no estúdio (painel direito, aba "Palco"): mensagem para o palco, mostrar/ocultar notas, iniciar/pausar/reiniciar o cronômetro do culto, e escolha do que aparece no retorno.

### Timers agendados no repertório
Cada item do repertório passa a ter uma **duração planejada** (minutos), editável na lista do repertório. Ao colocar um item ao vivo, o retorno de palco inicia a contagem regressiva dessa duração automaticamente. O repertório mostra o horário previsto de início de cada item, calculado a partir da hora de início do culto.

## 2. Busca global (Ctrl+F / Cmd+K)

Paleta de comandos por cima do estúdio:

- Digitar busca ao mesmo tempo em **músicas** (título, artista, tags e trecho da letra), **repertórios** e **referência bíblica** — reconhece padrões como `jo 3:16`, `salmos 23`, e também busca por trecho de texto do versículo.
- Resultados agrupados por tipo, com o trecho encontrado destacado; setas navegam, **Enter** carrega o item no preview (música → slides gerados; versículo → slide da passagem) e **Shift+Enter** manda direto para o ao vivo.
- Também aceita **comandos**: blackout, abertura/logo, congelar, abrir projeção, abrir retorno de palco, trocar tema (lista os temas salvos), iniciar/pausar cronômetro.
- Ctrl+F é interceptado no estúdio; Esc fecha.

## 3. Editor de loops interativos (fundos visuais)

No painel de Tema, adicionar uma seção "Loops" além de "Cor", "Imagem" e "Vídeo". O usuário cria fundos animados direto no sistema:

- **Tipos de loop:**
  - **Gradiente animado**: duas ou mais cores, direção linear/radial, velocidade, suavização.
  - **Partículas**: pontos, partículas suaves ou estrelas cadentes com parâmetros de velocidade, quantidade e cor.
  - **Mesh/liquid**: ondas suaves, névoa ou camadas blendadas para um visual orgânico.
  - **Pulsação**: loop que pulsa na batida (usa `bpm` da música para sincronizar velocidade).
- **Blending e camadas**: possibilidade de sobrepor uma imagem ou vídeo por cima do loop com modos de blend (multiply, screen, overlay) e opacidade.
- **Preset library**: loops salvos como temas (ex.: "Worship Blue", "Pôr do Sol Laranja", "Galáxia Suave") para reaproveitar.
- **Performance**: renderização via `<canvas>` ou WebGL leve (sem Three.js pesado); opção de reduzir FPS em previews pequenos e desligar animação se a aba perder foco.

## 4. Ideias extras para igreja

Funcionalidades que complementam bem um sistema de projeção:

- **Bíblia paralela**: abrir duas traduções lado a lado ao vivo, útil para pregação comparativa.
- **Notificação de alertas rápidos**: avisos pontuais que aparecem sobre o slide atual (ex.: "Silencie o celular", "Último louvor", "Oferta").
- **Teleprompter com rolagem automática**: no estúdio, rolar a letra conforme o bpm/tempo da música, facilitando para o operador.
- **Agenda/escala do culto**: pré-programar toda a sequência do culto (louvor, palavra, oferta, ceia) com horários e responsáveis, ligando automaticamente ao repertório.
- **Backup offline / cache local**: manter músicas e repertórios em `IndexedDB` para funcionar se a internet cair no meio do culto.
- **Modo leitor de letras para tablet**: uma rota simples que mostra apenas a letra atual em tela cheia, para o ministério de louvor acompanhar.

## Detalhes técnicos

- Estado ao vivo: estender `LiveState` em `src/lib/projection.ts` com `next` (próximo slide), `stage` (mensagem, notas, flags de exibição) e `timers` (início do culto, duração do item atual, timestamps de início/pausa). O `BroadcastChannel` já existente sincroniza tudo; `/projecao` ignora os campos de palco.
- Nova rota `src/routes/palco.tsx` (sem chrome, assina o estado ao vivo). Timers derivados de timestamps para não dessincronizar entre janelas.
- Busca: novo `src/components/studio/CommandPalette.tsx` usando o `Command` do shadcn; busca de músicas via nova server function em `src/lib/library.functions.ts` com `ilike` em título/letra (retornando um trecho de contexto), busca bíblica reaproveitando `src/lib/bible.functions.ts`.
- Duração dos itens: guardada em `setlist_items.payload` (`durationMin`), sem migração de schema; nova função de update no `library.functions.ts`.
- Loops: criar `src/lib/loops.ts` com funções de renderização em canvas; `ThemeConfig` ganha campos de loop (`loopKind`, `loopColors`, `loopSpeed`, `loopOverlay`, `loopBlend`). Os loops são armazenados como JSON no tema e reproduzidos no `SlideCanvas` e na projeção.
- O escopo deste plano prioriza **retorno de palco**, **busca global** e **editor de loops**. As ideias extras podem ser adicionadas depois, conforme prioridade.
