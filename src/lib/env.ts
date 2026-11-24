import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Revisa .env.local (ver .env.example).`);
  return value;
}

export const env = {
  get anthropicKey() {
    return required('ANTHROPIC_API_KEY');
  },
  get claudeModel() {
    return process.env.CLAUDE_MODEL || 'claude-haiku-5-5';
  },
  get geminiKey() {
    return required('GEMINI_API_KEY');
  },
  get githubToken() {
    return process.env.GITHUB_TOKEN || '';
  },
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabasePublishableKey() {
    return required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  },
  get supabaseSecretKey() {
    return required('SUPABASE_SECRET_KEY');
  },
};

/** Límites de uso para proteger el saldo de las APIs en la demo pública. */
export const LIMITS = {
  episodesPerUserPerDay: Number(process.env.LIMIT_EPISODES_PER_DAY || 3),
  chatMessagesPerUserPerDay: Number(process.env.LIMIT_CHAT_PER_DAY || 30),
  episodesGlobalPerDay: Number(process.env.LIMIT_EPISODES_GLOBAL_PER_DAY || 60),
};
