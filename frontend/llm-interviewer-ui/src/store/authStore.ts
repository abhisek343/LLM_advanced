import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define the shape of the authenticated user object
// This should align with what your backend's login/me endpoint returns
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'candidate' | 'hr' | 'admin'; // Or a more specific enum/type
  // Add any other relevant user fields, e.g., profile_status for HR
  hr_status?: "pending_profile" | "profile_complete" | "pending_mapping_approval" | "mapped";
  admin_manager_id?: string; // Added for HR users
  admin_manager_name?: string;
  // Potentially other role-specific details or a profile object
}

interface AuthState {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  actions: {
    setToken: (token: string) => void; // New action
    login: (user: User, token: string) => void;
    logout: () => void;
    setCurrentUser: (user: User | null) => void; // For updating user details, e.g., after profile update
    // Potentially a method to initialize state from localStorage/sessionStorage if token exists
  };
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      isAuthenticated: false,
      actions: {
        setToken: (token) => {
          set({ token }); // Just set the token
          sessionStorage.setItem('authToken', token); 
        },
        login: (user, token) => { // This is called after user details are fetched
          set({ currentUser: user, token, isAuthenticated: true });
          // Ensure token is in session storage, even if setToken was used.
          sessionStorage.setItem('authToken', token); 
        },
        logout: () => {
          set({ currentUser: null, token: null, isAuthenticated: false });
          sessionStorage.removeItem('authToken'); // Align with apiClient
          // Potentially call an API logout endpoint here
        },
        setCurrentUser: (user) => { // For profile updates etc.
          set((state) => {
            if (user) {
              return { currentUser: user, isAuthenticated: true, token: state.token };
            } else {
              // If user is explicitly set to null, treat as logout
              sessionStorage.removeItem('authToken');
              return { currentUser: null, isAuthenticated: false, token: null };
            }
          });
        },
      },
    }),
    {
      name: 'auth-storage', // Name of the item in storage (localStorage by default)
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage to align with apiClient
      // Only persist parts of the state if needed, e.g., token and user.
      // By default, it persists the entire state.
      // partialize: (state) => ({ token: state.token, currentUser: state.currentUser, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Export actions separately for easier usage in components if preferred
export const useAuthActions = () => useAuthStore((state) => state.actions);
// Export selectors for state values
export const useCurrentUser = () => useAuthStore((state) => state.currentUser);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthToken = () => useAuthStore((state) => state.token);

export default useAuthStore; // Export the whole store for convenience or direct access
