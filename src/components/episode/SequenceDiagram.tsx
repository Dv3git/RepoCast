'use client';

import { useId } from 'react';
import type { FlowStep, SequenceFlow } from '@/lib/types';

const COL_W = 184;
const HEAD_H = 42;
const TOP = 12;
const FIRST_ROW = TOP + HEAD_H + 30;
const ROW_H = 58;

const THEMES = {
  dark: {
    boxFill: '#181826',
    boxStroke: '#34344d',
    boxActive: '#8b5cf6',
    text: '#ececf6',
    muted: '#b4b4cc',
    lifeline: '#34344d',
    call: '#a78bfa',
    ret: '#8a8aa6',
    badge: '#8b5cf6',
    hover: 'rgba(139, 92, 246, 0.12)',
  },
  light: {
    boxFill: '#f5f3ff',
    boxStroke: '#c4b5fd',
    boxActive: '#7c3aed',
    text: '#1e1b2e',
    muted: '#3f3f56',
    lifeline: '#d4d4e0',
    call: '#7c3aed',
    ret: '#6b7280',
    badge: '#7c3aed',
    hover: 'rgba(124, 58, 237, 0.08)',
  },
};

function fit(text: string, px: number, charPx = 6.6) {
  const max = Math.max(6, Math.floor(px / charPx));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Parte un texto en hasta `maxLines` líneas que quepan en `px` píxeles. */
function wrap(text: string, px: number, maxLines = 2, charPx = 6.3) {
  const max = Math.max(8, Math.floor(px / charPx));
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines.map((l) => fit(l, px, charPx));
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fit(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, px, charPx);
  return kept;
}

interface Props {
  flow: SequenceFlow;
  theme?: 'dark' | 'light';
  /** Participantes que se iluminan (por ejemplo, el módulo del que se habla en el audio). */
  highlighted?: Set<string>;
  onStep?: (step: FlowStep, index: number) => void;
}

/** Diagrama de secuencia en SVG: columnas por participante y una flecha por paso. */
export function SequenceDiagram({ flow, theme = 'dark', highlighted, onStep }: Props) {
  const c = THEMES[theme];
  const uid = useId().replace(/:/g, '');
  const col = new Map(flow.participants.map((p, i) => [p.id, i]));
  const x = (id: string) => (col.get(id) ?? 0) * COL_W + COL_W / 2;
  const width = flow.participants.length * COL_W;
  const height = FIRST_ROW + flow.steps.length * ROW_H + 8;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block max-w-none"
      role="img"
      aria-label={`Diagrama de secuencia: ${flow.title}`}
      style={{ fontFamily: 'var(--font-sans), Arial, sans-serif' }}
    >
      <defs>
        <marker id={`call-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={c.call} />
        </marker>
        <marker id={`ret-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9" fill="none" stroke={c.ret} strokeWidth="1.6" />
        </marker>
      </defs>

      {flow.participants.map((p) => {
        const cx = x(p.id);
        const on = highlighted?.has(p.id);
        return (
          <g key={p.id}>
            <line x1={cx} x2={cx} y1={TOP + HEAD_H} y2={height - 4} stroke={c.lifeline} strokeDasharray="4 4" />
            <rect
              x={cx - COL_W / 2 + 12}
              y={TOP}
              width={COL_W - 24}
              height={HEAD_H}
              rx={10}
              fill={c.boxFill}
              stroke={on ? c.boxActive : c.boxStroke}
              strokeWidth={on ? 2 : 1}
            />
            <text x={cx} y={TOP + HEAD_H / 2 + 4.5} textAnchor="middle" fontSize="13" fontWeight="600" fill={c.text}>
              <title>{p.name}</title>
              {fit(p.name, COL_W - 40, 7.4)}
            </text>
          </g>
        );
      })}

      {flow.steps.map((s, i) => {
        const y = FIRST_ROW + i * ROW_H + 34;
        const x1 = x(s.from);
        const x2 = x(s.to);
        const self = s.from === s.to;
        const ret = s.kind === 'return';
        const stroke = ret ? c.ret : c.call;
        const clickable = Boolean(onStep && s.file);
        const labelX = self ? x1 + 50 : (x1 + x2) / 2;
        const room = self ? COL_W - 60 : Math.abs(x2 - x1) - 24;
        const lines = wrap(s.label, room);
        return (
          <g
            key={i}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `Paso ${i + 1}: ${s.label}. Ver el código` : undefined}
            onClick={clickable ? () => onStep?.(s, i) : undefined}
            onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onStep?.(s, i)) : undefined}
            className={clickable ? 'group cursor-pointer outline-none' : undefined}
          >
            <title>{`${i + 1}. ${s.label}${s.file ? ` (${s.file})` : ''}`}</title>
            <rect x={0} y={y - 40} width={width} height={ROW_H - 4} rx={8} fill="transparent" className={clickable ? 'group-hover:fill-[var(--hover)] group-focus-visible:fill-[var(--hover)]' : undefined} style={{ ['--hover' as string]: c.hover }} />
            {self ? (
              <path d={`M${x1},${y - 6} h36 v14 h-36`} fill="none" stroke={stroke} strokeWidth="1.6" strokeDasharray={ret ? '5 4' : undefined} markerEnd={`url(#${ret ? 'ret' : 'call'}-${uid})`} />
            ) : (
              <line x1={x1} x2={x2 + (x2 > x1 ? -3 : 3)} y1={y} y2={y} stroke={stroke} strokeWidth="1.6" strokeDasharray={ret ? '5 4' : undefined} markerEnd={`url(#${ret ? 'ret' : 'call'}-${uid})`} />
            )}
            <circle cx={x1} cy={y} r={9} fill={c.badge} />
            <text x={x1} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
              {i + 1}
            </text>
            <text x={labelX} y={self ? y + 2 - (lines.length - 1) * 7 : y - 8 - (lines.length - 1) * 15} textAnchor={self ? 'start' : 'middle'} fontSize="12" fill={c.muted}>
              {lines.map((line, k) => (
                <tspan key={k} x={labelX} dy={k === 0 ? 0 : 15}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
