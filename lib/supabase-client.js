// 模拟Supabase客户端
export const createClient = () => {
  console.warn('Supabase client is disabled in this deployment');
  return {
    auth: {
      signInWithOtp: async () => ({ error: { message: 'Supabase auth is disabled' } }),
      signUp: async () => ({ error: { message: 'Supabase auth is disabled' } }),
      signIn: async () => ({ error: { message: 'Supabase auth is disabled' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: null, error: null, subscription: { unsubscribe: () => {} } }),
      getUser: async () => ({ data: { user: null }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => null,
          data: [],
          error: null
        }),
        data: [],
        error: null
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null })
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  };
};

// 模拟其他Supabase相关函数
export const supabaseClient = createClient();
