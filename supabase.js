const SUPABASE_URL = 'https://gsfcyfslgndbdkfolkae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6ws8CnzSPM-tTfACkLfbMQ_BDJKLdHL';

const SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL && !SUPABASE_URL.includes('SEU-PROJETO') &&
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('SUA-CHAVE') &&
  typeof supabase !== 'undefined'
);

const supabaseClient = SUPABASE_CONFIGURED
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function supabaseReady() {
  return supabaseClient !== null;
}

async function signInWithSupabase(email, password) {
  if (!supabaseReady()) {
    return { error: { message: 'Supabase não está configurado.' } };
  }
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function signUpWithSupabase(email, password, nome) {
  if (!supabaseReady()) {
    return { error: { message: 'Supabase não está configurado.' } };
  }
  return await supabaseClient.auth.signUp(
    { email, password },
    { data: { nome } }
  );
}

async function signOutWithSupabase() {
  if (!supabaseReady()) {
    return { error: { message: 'Supabase não está configurado.' } };
  }
  return await supabaseClient.auth.signOut();
}

async function signInWithGithub() {
  if (!supabaseReady()) {
    if (typeof mostrarToast === 'function') {
      mostrarToast('⚠️', 'Configure SUPABASE_URL e SUPABASE_ANON_KEY em supabase.js.', true);
    }
    return;
  }
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'github' });
  if (error && typeof mostrarToast === 'function') {
    mostrarToast('⚠️', error.message || 'Falha ao iniciar login com GitHub.', true);
  }
}
