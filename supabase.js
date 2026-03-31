const SUPABASE_URL = 'https://gsfcyfslgndbdkfolkae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6ws8CnzSPM-tTfACkLfbMQ_BDJKLdHL';

function createSupabaseClient() {
  const provider = typeof window !== 'undefined'
    ? window.supabase
    : (typeof supabase !== 'undefined' ? supabase : null);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !provider || typeof provider.createClient !== 'function') {
    return null;
  }
  try {
    return provider.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Falha ao criar cliente Supabase:', error);
    return null;
  }
}

const supabaseClient = createSupabaseClient();

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

