import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type AuthMode = 'signIn' | 'signUp';

interface AuthState {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  mode: AuthMode;
  modalOpen: boolean;
  openModal: (mode?: AuthMode) => void;
  closeModal: () => void;
  setMode: (mode: AuthMode) => void;
  init: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  user: null,
  mode: 'signIn',
  modalOpen: false,
  openModal: (mode) => set({ modalOpen: true, mode: mode ?? get().mode }),
  closeModal: () => set({ modalOpen: false }),
  setMode: (mode) => set({ mode }),
  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session ?? null, user: data.session?.user ?? null, initialized: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session: session ?? null, user: session?.user ?? null });
    });
  },
  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ modalOpen: false });
  },
  signUpWithPassword: async (email, password, displayName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    if (error) throw error;
    set({ modalOpen: false });
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));

