// =========================================================================
// ClickSA — Mòdul del Núvol (Supabase Auth & Storage)
// =========================================================================

const ACTIVE_CLOUD_SA_KEY = 'clicksa_active_cloud_id';

export function getSupabaseConfig() {
    const winCfg = window.APP_CONFIG || {};
    return {
        supabaseUrl: winCfg.supabaseUrl || '',
        supabaseAnonKey: winCfg.supabaseAnonKey || ''
    };
}

let supabaseClient = null;

export function initSupabase() {
    if (supabaseClient) return supabaseClient;
    try {
        const cfg = getSupabaseConfig();
        if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'clicksa_auth_token'
                }
            });
        }
    } catch (err) {
        console.warn("ClickSA: No s'ha pogut inicialitzar el client de Supabase:", err);
        supabaseClient = null;
    }
    return supabaseClient;
}

export function getClient() {
    if (!supabaseClient) initSupabase();
    return supabaseClient;
}

// -------------------------------------------------------------------------
// AUTENTICACIÓ
// -------------------------------------------------------------------------

export async function getCurrentSession() {
    try {
        const sb = getClient();
        if (!sb || !sb.auth) return null;
        const { data, error } = await sb.auth.getSession();
        if (error) return null;
        return data?.session || null;
    } catch (e) {
        return null;
    }
}

export async function getCurrentUser() {
    try {
        const session = await getCurrentSession();
        return session?.user || null;
    } catch (e) {
        return null;
    }
}

export function onAuthStateChange(callback) {
    try {
        const sb = getClient();
        if (!sb || !sb.auth) return { unsubscribe: () => {} };
        const res = sb.auth.onAuthStateChange((event, session) => {
            try {
                callback(event, session);
            } catch (err) {
                console.error("Error in onAuthStateChange callback", err);
            }
        });
        return res?.data?.subscription || { unsubscribe: () => {} };
    } catch (e) {
        return { unsubscribe: () => {} };
    }
}

export async function signInWithEmail(email, password) {
    const sb = getClient();
    if (!sb || !sb.auth) throw new Error("Supabase no està configurat o no s'ha pogut carregar.");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

function getAuthRedirectUrl() {
    if (window.location.protocol === 'file:') {
        return 'http://127.0.0.1:5566/index.html';
    }
    return window.location.origin + window.location.pathname;
}

export async function signUpWithEmail(email, password) {
    const sb = getClient();
    if (!sb || !sb.auth) throw new Error("Supabase no està configurat o no s'ha pogut carregar.");
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
    return data;
}

export async function resetPassword(email) {
    const sb = getClient();
    if (!sb || !sb.auth) throw new Error("Supabase no està configurat o no s'ha pogut carregar.");
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
}

export async function signOutUser() {
    const sb = getClient();
    if (!sb || !sb.auth) return;
    setActiveCloudSAId(null);
    try {
        const { error } = await sb.auth.signOut();
        if (error) throw error;
    } catch (e) {
        console.warn("SignOut warning", e);
    }
}

// -------------------------------------------------------------------------
// GESTIÓ DE SITUACIONS D'APRENENTATGE AL NÚVOL
// -------------------------------------------------------------------------

export function getActiveCloudSAId() {
    try {
        return sessionStorage.getItem(ACTIVE_CLOUD_SA_KEY) || null;
    } catch (e) {
        return null;
    }
}

export function setActiveCloudSAId(id) {
    try {
        if (id) sessionStorage.setItem(ACTIVE_CLOUD_SA_KEY, id);
        else sessionStorage.removeItem(ACTIVE_CLOUD_SA_KEY);
    } catch (e) {}
}

export async function fetchUserSAs() {
    const sb = getClient();
    if (!sb) throw new Error("Supabase no està disponible.");
    const user = await getCurrentUser();
    if (!user) throw new Error("Has d'iniciar sessió per consultar les teues SA.");

    const { data, error } = await sb
        .from('situacions_aprenentatge')
        .select('id, sa_num, title, area, cicle, curs, trimestre, created_at, updated_at')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function fetchSAById(id) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase no està disponible.");

    const { data, error } = await sb
        .from('situacions_aprenentatge')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function saveSAToCloud(saState, asNew = false) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase no està disponible.");
    const user = await getCurrentUser();
    if (!user) throw new Error("Has d'iniciar sessió per desar la SA al núvol.");

    const saNum = saState.inputs?.['input-sa-num'] || '';
    const saTitle = saState.inputs?.['input-sa-title'] || 'Sense títol';
    const area = saState.selects?.['input-area'] || '';
    const cicle = saState.selects?.['input-cicle'] || '';
    const curs = saState.selects?.['input-curs'] || '';
    const trimestre = saState.selects?.['input-trimestre'] || '';

    const payload = {
        sa_num: saNum,
        title: saTitle,
        area: area,
        cicle: cicle,
        curs: curs,
        trimestre: trimestre,
        data: saState
    };

    const currentId = getActiveCloudSAId();

    if (currentId && !asNew) {
        const { data, error } = await sb
            .from('situacions_aprenentatge')
            .update(payload)
            .eq('id', currentId)
            .select('id, title, updated_at')
            .single();

        if (error) throw error;
        return { id: currentId, title: saTitle, isUpdate: true };
    } else {
        const { data, error } = await sb
            .from('situacions_aprenentatge')
            .insert(payload)
            .select('id, title, updated_at')
            .single();

        if (error) throw error;
        setActiveCloudSAId(data.id);
        return { id: data.id, title: saTitle, isUpdate: false };
    }
}

export async function deleteSAFromCloud(id) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase no està disponible.");

    const { error } = await sb
        .from('situacions_aprenentatge')
        .delete()
        .eq('id', id);

    if (error) throw error;
    if (getActiveCloudSAId() === id) {
        setActiveCloudSAId(null);
    }
    return true;
}
