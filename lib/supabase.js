import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _client = null;

// Usuario demo para cuando no hay Supabase configurado
const DEMO_USER = {
    id: 'demo-user-00000000-0000-0000-0000-000000000000',
    email: 'demo@writiai.com',
    created_at: new Date().toISOString(),
};

const DEMO_SESSION = {
    user: DEMO_USER,
    access_token: 'demo-token',
};

// Estado interno del mock
let _mockSession = null;
let _authCallbacks = [];

function createMockClient() {
    return {
        auth: {
            getSession: () => Promise.resolve({ data: { session: _mockSession } }),
            getUser: () => Promise.resolve({ data: { user: _mockSession ? DEMO_USER : null } }),
            signUp: ({ email }) => {
                _mockSession = { ...DEMO_SESSION, user: { ...DEMO_USER, email } };
                _authCallbacks.forEach(cb => cb('SIGNED_IN', _mockSession));
                return Promise.resolve({ data: { user: { ...DEMO_USER, email }, session: _mockSession }, error: null });
            },
            signInWithPassword: ({ email }) => {
                _mockSession = { ...DEMO_SESSION, user: { ...DEMO_USER, email } };
                _authCallbacks.forEach(cb => cb('SIGNED_IN', _mockSession));
                return Promise.resolve({ data: { user: { ...DEMO_USER, email }, session: _mockSession }, error: null });
            },
            signOut: () => {
                _mockSession = null;
                _authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
                return Promise.resolve({ error: null });
            },
            onAuthStateChange: (cb) => {
                _authCallbacks.push(cb);
                return {
                    data: {
                        subscription: {
                            unsubscribe: () => {
                                _authCallbacks = _authCallbacks.filter(c => c !== cb);
                            },
                        },
                    },
                };
            },
        },
        from: (table) => {
            // Almacenamiento en memoria para el modo demo
            if (typeof window !== 'undefined') {
                if (!window.__mockDB) window.__mockDB = {};
                if (!window.__mockDB[table]) window.__mockDB[table] = [];
            }
            const getStore = () => (typeof window !== 'undefined' ? window.__mockDB[table] : []);

            return {
                select: (cols) => {
                    const chain = {
                        eq: (col, val) => {
                            const sub = {
                                eq: (col2, val2) => ({
                                    single: () => {
                                        const items = getStore().filter(r => r[col] === val && r[col2] === val2);
                                        return Promise.resolve({ data: items[0] || null, error: null });
                                    },
                                    order: (orderCol, opts) => Promise.resolve({
                                        data: getStore().filter(r => r[col] === val && r[col2] === val2),
                                        error: null,
                                    }),
                                }),
                                single: () => {
                                    const items = getStore().filter(r => r[col] === val);
                                    return Promise.resolve({ data: items[0] || null, error: null });
                                },
                                order: (orderCol, opts) => Promise.resolve({
                                    data: getStore().filter(r => r[col] === val),
                                    error: null,
                                }),
                            };
                            return sub;
                        },
                    };
                    return chain;
                },
                insert: (row) => {
                    const store = getStore();
                    const newRow = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), ...row, created_at: new Date().toISOString() };
                    store.push(newRow);
                    return Promise.resolve({ data: newRow, error: null });
                },
                upsert: (row) => {
                    const store = getStore();
                    const idx = store.findIndex(r => r.id === row.id);
                    if (idx >= 0) {
                        store[idx] = { ...store[idx], ...row };
                    } else {
                        store.push({ ...row, created_at: new Date().toISOString() });
                    }
                    return Promise.resolve({ data: row, error: null });
                },
                update: (updates) => ({
                    eq: (col, val) => {
                        const store = getStore();
                        const idx = store.findIndex(r => r[col] === val);
                        if (idx >= 0) store[idx] = { ...store[idx], ...updates };
                        return Promise.resolve({ error: null });
                    },
                }),
                delete: () => ({
                    eq: (col, val) => {
                        if (typeof window !== 'undefined' && window.__mockDB[table]) {
                            window.__mockDB[table] = window.__mockDB[table].filter(r => r[col] !== val);
                        }
                        return Promise.resolve({ error: null });
                    },
                }),
            };
        },
        channel: (name) => {
            const chain = {
                on: () => chain,
                subscribe: () => { }
            };
            return chain;
        },
        removeChannel: () => { }
    };
}

export function createSupabaseClient() {
    const isPlaceholder =
        !supabaseUrl ||
        !supabaseAnonKey ||
        supabaseUrl.includes('placeholder') ||
        supabaseAnonKey.includes('placeholder');

    if (isPlaceholder) {
        return createMockClient();
    }
    if (!_client) {
        _client = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _client;
}
