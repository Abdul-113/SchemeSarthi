import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useAuthStore = create((set) => ({
    user: null,
    session: null,
    loading: true,

    initialize: async () => {
        // Get current session on app load
        const { data: { session } } = await supabase.auth.getSession();
        set({ session, user: session?.user ?? null, loading: false });

        // Listen for auth state changes (login/logout/token refresh)
        supabase.auth.onAuthStateChange((_event, session) => {
            set({ session, user: session?.user ?? null, loading: false });
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },

    // Helper: get real Supabase user_id for API calls
    getUserId: () => {
        const { user } = useAuthStore.getState();
        return user?.id ?? null;
    }
}));
