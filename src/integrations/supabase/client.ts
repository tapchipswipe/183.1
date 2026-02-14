type QueryResult<T = any> = Promise<{ data: T | null; error: any }>;

const emptyResult = async <T = any>(data: T | null = null): QueryResult<T> => ({ data, error: null });

function builder() {
  const api: any = {
    select: () => api,
    eq: () => api,
    in: () => api,
    order: () => api,
    limit: () => api,
    single: () => emptyResult(null),
    insert: () => emptyResult([]),
    update: () => api,
    delete: () => api,
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return api;
}

const MOCK_USER = {
  id: "mock-user-despotlucas",
  email: "despotlucas@gmail.com",
  password: "admin1234",
};

let currentSession: any = null;
const listeners = new Set<(event: string, session: any) => void>();

function emit(event: string, session: any) {
  for (const listener of listeners) listener(event, session);
}

const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const isValid = email === MOCK_USER.email && password === MOCK_USER.password;
    if (!isValid) {
      return { data: null, error: { message: "Invalid login credentials" } };
    }
    currentSession = {
      access_token: "mock-access-token",
      user: { id: MOCK_USER.id, email: MOCK_USER.email },
    };
    emit("SIGNED_IN", currentSession);
    return { data: { session: currentSession, user: currentSession.user }, error: null };
  },
  async signUp({ email, password }: { email: string; password: string }) {
    const matchesMockUser = email === MOCK_USER.email && password === MOCK_USER.password;
    if (!matchesMockUser) {
      return {
        data: null,
        error: {
          message: "This reconstructed app supports one seeded local user only.",
        },
      };
    }
    currentSession = {
      access_token: "mock-access-token",
      user: { id: MOCK_USER.id, email: MOCK_USER.email },
    };
    emit("SIGNED_IN", currentSession);
    return { data: { session: currentSession, user: currentSession.user }, error: null };
  },
  async signOut() {
    currentSession = null;
    emit("SIGNED_OUT", null);
    return { error: null };
  },
  async getSession() { return { data: { session: currentSession }, error: null }; },
  onAuthStateChange(cb: any) {
    listeners.add(cb);
    const sub = { unsubscribe: () => listeners.delete(cb) };
    setTimeout(() => cb("INITIAL_SESSION", currentSession), 0);
    return { data: { subscription: sub } };
  },
};

export const supabase: any = {
  auth,
  from() { return builder(); },
  channel() {
    const channel = {
      on() { return channel; },
      subscribe() { return channel; },
    };
    return channel;
  },
  removeChannel() { return Promise.resolve("ok"); },
};
