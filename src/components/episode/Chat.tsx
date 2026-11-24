'use client';

import Link from 'next/link';
import { Fragment, useRef, useState } from 'react';
import { parseMarkdown, type Inline } from '@/lib/mini-markdown';
import type { FileTarget } from './CodeDrawer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function InlineView({ tokens, onOpen }: { tokens: Inline[]; onOpen: (t: FileTarget) => void }) {
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === 'bold') return <strong key={i}>{t.text}</strong>;
        if (t.type === 'code') return <code key={i}>{t.text}</code>;
        if (t.type === 'cite')
          return (
            <button
              key={i}
              onClick={() => onOpen({ path: t.path, from: t.from, to: t.to })}
              className="focus-ring mx-0.5 rounded-md border border-brand-500/40 bg-brand-500/10 px-1.5 py-0.5 font-mono text-[0.8em] text-brand-400 hover:bg-brand-500/20"
            >
              {t.text}
            </button>
          );
        return <Fragment key={i}>{t.text}</Fragment>;
      })}
    </>
  );
}

function MarkdownView({ text, onOpen }: { text: string; onOpen: (t: FileTarget) => void }) {
  return (
    <div className="chat-md text-sm leading-relaxed">
      {parseMarkdown(text).map((b, i) =>
        b.type === 'p' ? (
          <p key={i}>
            <InlineView tokens={b.content} onOpen={onOpen} />
          </p>
        ) : b.type === 'pre' ? (
          <pre key={i} className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-xs leading-relaxed">
            <code>{b.code}</code>
          </pre>
        ) : (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineView tokens={item} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export function Chat({ episodeId, kind, onOpenFile, slug }: { episodeId: string; kind: 'overview' | 'changes'; onOpenFile: (t: FileTarget) => void; slug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const suggestions =
    kind === 'overview'
      ? ['¿Por dónde empiezo a leer el código?', '¿Cómo fluye una petición de principio a fin?', '¿Qué partes mejorarías?']
      : ['¿Hay algo que rompa la compatibilidad?', '¿Qué tengo que cambiar para actualizar?', '¿Cuál es el cambio más importante?'];

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError('');
    const history: Message[] = [...messages, { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch(`/api/episodes/${episodeId}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (res.status === 401) {
        setNeedsLogin(true);
        setMessages(messages);
        return;
      }
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'No se pudo responder.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: answer }]);
        box.current?.scrollTo({ top: box.current.scrollHeight });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo responder.');
      setMessages(history.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[560px] flex-col rounded-xl border border-ink-800 bg-ink-900/60">
      <div ref={box} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-3xl" aria-hidden="true">
              💬
            </p>
            <p className="mt-2 font-medium">Pregúntale al repositorio</p>
            <p className="mt-1 max-w-sm text-sm text-ink-400">Claude responde leyendo el código y cita los ficheros: pulsa una cita para abrirla.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="focus-ring rounded-full border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-brand-500 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500/25 px-4 py-2.5 text-sm">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md border border-ink-800 bg-ink-850 px-4 py-3">
              {m.content ? (
                <MarkdownView text={m.content} onOpen={onOpenFile} />
              ) : (
                <span className="flex gap-1 py-1" aria-label="Escribiendo">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </span>
              )}
            </div>
          ),
        )}
      </div>

      {needsLogin ? (
        <p className="border-t border-ink-800 p-4 text-center text-sm text-ink-300">
          <Link href={`/entrar?next=${encodeURIComponent(`/e/${slug}`)}`} className="text-brand-400 hover:underline">
            Entra en tu cuenta
          </Link>{' '}
          para preguntar al chat (es gratis).
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2 border-t border-ink-800 p-3"
        >
          <label htmlFor="chat-input" className="sr-only">
            Tu pregunta
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="¿Dónde se gestiona la autenticación?"
            maxLength={1000}
            className="focus-ring flex-1 rounded-xl border border-ink-700 bg-ink-950 px-3.5 py-2.5 text-sm placeholder:text-ink-600"
          />
          <button disabled={busy || !input.trim()} className="focus-ring brand-gradient rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50">
            Enviar
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
