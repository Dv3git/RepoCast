'use client';

import dagre from '@dagrejs/dagre';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import type { ModuleKind, RepoModule, RepoRelation } from '@/lib/types';

const KIND_STYLE: Record<ModuleKind, { label: string; color: string }> = {
  ui: { label: 'Interfaz', color: '#a78bfa' },
  api: { label: 'API', color: '#f472b6' },
  service: { label: 'Servicio', color: '#fb923c' },
  data: { label: 'Datos', color: '#34d399' },
  config: { label: 'Config', color: '#94a3b8' },
  infra: { label: 'Infra', color: '#60a5fa' },
  test: { label: 'Tests', color: '#facc15' },
  docs: { label: 'Docs', color: '#cbd5e1' },
  cli: { label: 'CLI', color: '#2dd4bf' },
  library: { label: 'Librería', color: '#c084fc' },
  other: { label: 'Otro', color: '#8a8aa6' },
};

type ModuleNode = Node<{ module: RepoModule; active: boolean; selected: boolean }, 'module'>;

const NODE_W = 210;
const NODE_H = 64;

function ModuleNodeView({ data }: NodeProps<ModuleNode>) {
  const { module, active, selected } = data;
  const kind = KIND_STYLE[module.kind] ?? KIND_STYLE.other;
  return (
    <div
      className={`rounded-xl border bg-ink-850 px-3.5 py-2.5 text-left shadow-lg transition ${
        selected ? 'border-white' : active ? 'border-pink-500 shadow-pink-500/30' : 'border-ink-600'
      }`}
      style={{ width: NODE_W, boxShadow: active ? `0 0 0 3px ${kind.color}33` : undefined }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-ink-600" />
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: kind.color }} />
        <span className="truncate text-sm font-semibold text-ink-100">{module.name}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-400">
        {kind.label} · {module.files.length} fichero{module.files.length === 1 ? '' : 's'}
      </p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-ink-600" />
    </div>
  );
}

const nodeTypes = { module: ModuleNodeView };

function layout(modules: RepoModule[], relations: RepoRelation[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 44, ranksep: 150 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const m of modules) g.setNode(m.id, { width: NODE_W, height: NODE_H });
  for (const r of relations) g.setEdge(r.from, r.to);
  dagre.layout(g);
  return new Map(modules.map((m) => {
    const p = g.node(m.id);
    return [m.id, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }];
  }));
}

interface Props {
  modules: RepoModule[];
  relations: RepoRelation[];
  /** Ficheros de los que se está hablando ahora mismo en el podcast. */
  activeFiles: string[];
  onOpenFile: (path: string) => void;
}

export function ArchitectureMap({ modules, relations, activeFiles, onOpenFile }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(modules[0]?.id ?? null);
  const positions = useMemo(() => layout(modules, relations), [modules, relations]);
  const activeIds = useMemo(
    () => new Set(modules.filter((m) => m.files.some((f) => activeFiles.includes(f))).map((m) => m.id)),
    [modules, activeFiles],
  );

  const nodes: ModuleNode[] = modules.map((m) => ({
    id: m.id,
    type: 'module',
    position: positions.get(m.id) ?? { x: 0, y: 0 },
    data: { module: m, active: activeIds.has(m.id), selected: m.id === selectedId },
    draggable: true,
  }));

  const edges: Edge[] = relations.map((r, i) => ({
    id: `e${i}`,
    source: r.from,
    target: r.to,
    label: r.label,
    animated: activeIds.has(r.from) || activeIds.has(r.to),
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4b4b6b' },
    labelStyle: { fontSize: 11 },
  }));

  const selected = modules.find((m) => m.id === selectedId);

  if (modules.length === 0) return <p className="text-sm text-ink-400">No hay mapa para este repositorio.</p>;

  return (
    <div className="space-y-4">
      <div className="h-[420px] overflow-hidden rounded-xl border border-ink-800 bg-ink-950/70">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          nodesConnectable={false}
        >
          <Background gap={24} size={1} color="#232336" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {selected && (
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: (KIND_STYLE[selected.kind] ?? KIND_STYLE.other).color }} />
            <h3 className="font-semibold">{selected.name}</h3>
            <span className="text-xs text-ink-400">{(KIND_STYLE[selected.kind] ?? KIND_STYLE.other).label}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">{selected.description}</p>
          {selected.files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.files.map((f) => (
                <button
                  key={f}
                  onClick={() => onOpenFile(f)}
                  className="focus-ring rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[11px] text-ink-300 hover:border-brand-500 hover:text-white"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
