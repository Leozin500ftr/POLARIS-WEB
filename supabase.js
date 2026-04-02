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

function shouldSyncStorageKey(key) {
  if (!key || typeof key !== 'string') return false;
  const normalized = key.toString().toLowerCase();
  if (normalized.startsWith('supabase') || normalized.startsWith('sb-') || normalized.startsWith('sb:')) {
    return false;
  }
  return true;
}

let _localStorageRestoreActive = false;
let _localStorageMemory = {};
let _localStorageMemoryEnabled = false;
let _localStorageOriginal = null;

async function getAuthenticatedUser() {
  if (!supabaseReady()) return null;
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data || !data.user) return null;
  return data.user;
}

async function syncLocalStorageItem(key, value) {
  if (!supabaseReady() || !shouldSyncStorageKey(key)) return;
  const user = await getAuthenticatedUser();
  if (!user) return;

  try {
    await supabaseClient.from('polaris_storage').upsert(
      {
        user_id: user.id,
        key,
        value: String(value)
      },
      { onConflict: ['user_id', 'key'], returning: 'minimal' }
    );
  } catch (error) {
    console.error('Falha ao salvar localStorage no Supabase:', error);
  }
}

async function removeLocalStorageKey(key) {
  if (!supabaseReady() || !shouldSyncStorageKey(key)) return;
  const user = await getAuthenticatedUser();
  if (!user) return;

  try {
    await supabaseClient.from('polaris_storage').delete().match({ user_id: user.id, key });
  } catch (error) {
    console.error('Falha ao remover localStorage no Supabase:', error);
  }
}

function patchLocalStorageSync() {
  if (typeof window === 'undefined' || !window.localStorage || window.localStorage._supabasePatched) {
    return;
  }

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  Storage.prototype.getItem = function(key) {
    if (this === window.localStorage && _localStorageMemoryEnabled) {
      return Object.prototype.hasOwnProperty.call(_localStorageMemory, key)
        ? _localStorageMemory[key]
        : null;
    }
    return originalGetItem.call(this, key);
  };

  Storage.prototype.setItem = function(key, value) {
    if (this === window.localStorage && _localStorageMemoryEnabled && ! _localStorageRestoreActive) {
      _localStorageMemory[key] = String(value);
      if (shouldSyncStorageKey(key)) {
        syncLocalStorageItem(key, value);
      }
      return;
    }
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && ! _localStorageRestoreActive && shouldSyncStorageKey(key)) {
      syncLocalStorageItem(key, value);
    }
  };

  Storage.prototype.removeItem = function(key) {
    if (this === window.localStorage && _localStorageMemoryEnabled && ! _localStorageRestoreActive) {
      delete _localStorageMemory[key];
      if (shouldSyncStorageKey(key)) {
        removeLocalStorageKey(key);
      }
      return;
    }
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && ! _localStorageRestoreActive && shouldSyncStorageKey(key)) {
      removeLocalStorageKey(key);
    }
  };

  Storage.prototype.clear = function() {
    if (this === window.localStorage && _localStorageMemoryEnabled && ! _localStorageRestoreActive) {
      Object.keys(_localStorageMemory).forEach(key => {
        if (shouldSyncStorageKey(key)) {
          removeLocalStorageKey(key);
        }
      });
      _localStorageMemory = {};
      return;
    }
    originalClear.call(this);
  };

  _localStorageOriginal = {
    getItem: originalGetItem,
    setItem: originalSetItem,
    removeItem: originalRemoveItem,
    clear: originalClear
  };

  window.localStorage._supabasePatched = true;
}

async function loadLocalStorageFromSupabase() {
  if (!supabaseReady()) return false;
  const user = await getAuthenticatedUser();
  if (!user) return false;

  const { data, error } = await supabaseClient
    .from('polaris_storage')
    .select('key,value')
    .eq('user_id', user.id);

  if (error || !data) {
    return false;
  }

  _localStorageMemoryEnabled = false;
  _localStorageMemory = {};
  data.forEach(({ key, value }) => {
    if (shouldSyncStorageKey(key) && key) {
      _localStorageMemory[key] = value === null ? '' : value;
    }
  });
  _localStorageMemoryEnabled = true;

  if (_localStorageOriginal && _localStorageOriginal.removeItem) {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      keys.push(window.localStorage.key(i));
    }
    keys.forEach((key) => {
      if (shouldSyncStorageKey(key)) {
        _localStorageOriginal.removeItem.call(window.localStorage, key);
      }
    });
  }

  return true;
}

patchLocalStorageSync();

