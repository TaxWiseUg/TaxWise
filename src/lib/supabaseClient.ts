import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.'
  );
}

// Safe Proxy helper to prevent hydration crashes during initialization when env variables are missing.
// It allows the app to load and hydrates Javascript, throwing a clean error when a database call is made.
type SafeProxy = Record<string, unknown> & ((...args: unknown[]) => unknown);
const createSafeProxy = (path: string = ""): SafeProxy => {
  const dummyFn = () => {
    throw new Error(
      `Supabase client operation failed because environment variables are not configured. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your hosting settings (e.g. Vercel dashboard).`
    );
  };
  return new Proxy(dummyFn, {
    get: (target, prop) => {
      if (prop === "then") return undefined; // Avoid blocking async/await resolution
      return createSafeProxy(`${path}.${String(prop)}`) as unknown;
    }
  });
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createSafeProxy("supabase") as ReturnType<typeof createClient>);
