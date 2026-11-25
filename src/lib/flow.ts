// Diagrama de secuencia del recorrido principal: limpieza de lo que devuelve Claude
// y conversión a Mermaid (para el Markdown descargable y para copiarlo).
import type { FlowParticipant, FlowStep, SequenceFlow } from '@/lib/types';

export const MAX_PARTICIPANTS = 6;
export const MAX_STEPS = 14;

interface CleanContext {
  /** Rutas que existen en el repositorio. */
  paths: Set<string>;
  /** Ficheros visibles para Claude y su número de líneas. */
  visible: Map<string, number>;
  /** ids de los módulos del mapa. */
  moduleIds: Set<string>;
}

function mermaidId(raw: string, used: Set<string>) {
  let id = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!/^[A-Za-z]/.test(id)) id = `P${id}`;
  id = id.slice(0, 24);
  let unique = id;
  for (let n = 2; used.has(unique); n++) unique = `${id}${n}`;
  used.add(unique);
  return unique;
}

/** Quita participantes repetidos o sin uso, pasos rotos, rutas inventadas y líneas fuera de rango. */
export function cleanFlow(flow: SequenceFlow, ctx: CleanContext): SequenceFlow | null {
  const used = new Set<string>();
  const rename = new Map<string, string>();
  const participants: FlowParticipant[] = [];
  for (const p of flow.participants) {
    if (participants.length >= MAX_PARTICIPANTS || rename.has(p.id) || !p.name.trim()) continue;
    const id = mermaidId(p.id || p.name, used);
    rename.set(p.id, id);
    participants.push({ id, name: p.name.trim().slice(0, 40), module: ctx.moduleIds.has(p.module) ? p.module : '' });
  }

  const steps: FlowStep[] = [];
  for (const s of flow.steps) {
    const from = rename.get(s.from);
    const to = rename.get(s.to);
    const label = s.label.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!from || !to || !label || steps.length >= MAX_STEPS) continue;
    const step: FlowStep = { from, to, label, kind: s.kind === 'return' ? 'return' : 'call' };
    if (s.file && ctx.paths.has(s.file)) {
      step.file = s.file;
      const total = ctx.visible.get(s.file);
      if (total && s.startLine && s.startLine > 0) {
        const start = Math.min(s.startLine, total);
        step.startLine = start;
        step.endLine = Math.min(Math.max(start, s.endLine ?? start), total, start + 60);
      }
    }
    steps.push(step);
  }

  // Un participante que no sale en ningún paso solo ocupa sitio.
  const inUse = new Set(steps.flatMap((s) => [s.from, s.to]));
  const kept = participants.filter((p) => inUse.has(p.id));
  if (kept.length < 2 || steps.length < 2) return null;
  return {
    title: flow.title.trim().slice(0, 90),
    description: flow.description.trim().slice(0, 400),
    participants: kept,
    steps,
  };
}

/** Texto que Mermaid no admite dentro de un nombre o un mensaje. */
function mermaidText(text: string) {
  return text.replace(/[;#\n\r]/g, ',').replace(/:/g, ' -').replace(/\s+/g, ' ').trim();
}

export function toMermaid(flow: SequenceFlow): string {
  const lines = ['sequenceDiagram', '  autonumber'];
  for (const p of flow.participants) lines.push(`  participant ${p.id} as ${mermaidText(p.name)}`);
  for (const s of flow.steps) lines.push(`  ${s.from}${s.kind === 'return' ? '-->>' : '->>'}${s.to}: ${mermaidText(s.label)}`);
  return lines.join('\n');
}
