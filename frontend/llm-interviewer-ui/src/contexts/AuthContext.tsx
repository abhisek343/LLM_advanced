import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import useAuthStore, { useAuthActions, useCurrentUser, useIsAuthenticated, type User as ZustandUser } from '../store/authStore';
import { getCurrentUser as fetchCurrentUserApi } from '../services/authAPI'; // Renamed to avoid conflict

// The UserDetails type should align with ZustandUser from authStore
export type UserDetails = ZustandUser;

interface AuthContextType {
  currentUser: UserDetails | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Keep local loading state for initial auth check
  setToken: (token: string) => void; // New: Expose setToken from Zustand
  login: (user: UserDetails, token: string) => void; // Matches Zustand store's login
  logout: () => void; // Matches Zustand store's logout
  setCurrentUser: (user: UserDetails | null) => void; // Matches Zustand store's setCurrentUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const storeCurrentUser = useCurrentUser();
  const storeIsAuthenticated = useIsAuthenticated();
  const storeActions = useAuthActions();
  const [isLoading, setIsLoading] = useState(true); // Local loading state for initial check

  // Effect to check auth status on initial load if not already handled by Zustand's persist rehydration
  // This bridges the gap if getCurrentUser API call is needed after rehydration.
  useEffect(() => {
    const initializeAuth = async () => {
      // Zustand's persist middleware handles rehydrating token and user from sessionStorage.
      // We might still want to verify the token or fetch fresh user details.
      // let stillLoading = true; // Removed as it's not used
      try {
        const tokenFromStore = useAuthStore.getState().token; // Access token directly for initial check
        const zustandIsAuthenticated = useAuthStore.getState().isAuthenticated;
        const zustandCurrentUser = useAuthStore.getState().currentUser;

        if (tokenFromStore && (!zustandCurrentUser || !zustandIsAuthenticated)) { // Token exists but user not fully set in store or not marked authenticated
          // console.log("AuthContext: Token found, attempting to fetch/verify current user.");
          const userDetails = await fetchCurrentUserApi(); // This API should use the token
          storeActions.login(userDetails, tokenFromStore); // Update Zustand store, this will set isAuthenticated
        } else if (zustandIsAuthenticated && zustandCurrentUser) {
          // console.log("AuthContext: User already authenticated and present in Zustand store.");
        } else {
          // No token, or inconsistent state, ensure logout if necessary
          // console.log("AuthContext: No token or user not authenticated in store. Ensuring logged out state.");
          if (zustandIsAuthenticated || zustandCurrentUser) { // If store thinks it's auth but no token, clear it
            storeActions.logout();
          }
        }
      } catch (error) {
        console.error('AuthContext: Failed to initialize auth, logging out:', error);
        storeActions.logout(); // Clear invalid session from store
      } finally {
        // stillLoading = false; // Removed
        setIsLoading(false);
      }
    };

    // We want this to run once to determine initial auth state.
    // The `isLoading` from this context is critical for `ProtectedRoute`.
    // The condition `!useAuthStore.getState().isAuthenticated` might be too restrictive
    // if we always want to try fetching user details if a token exists, even if Zustand
    // initially says authenticated (to verify/refresh).
    // Let's simplify: always try to initialize, and let initializeAuth handle logic.
    // The local isLoading state of AuthProvider is the source of truth for "initial auth check in progress".
    if (isLoading) { // Only run if this provider's isLoading is true
      initializeAuth();
    }
    // If for some reason initializeAuth wasn't called (e.g. isLoading was already false by a quick re-render),
    // ensure isLoading is eventually set to false. This is a safeguard.
    // However, the primary path is initializeAuth() setting it.
    // This else block might be redundant if initializeAuth always runs when isLoading is true.
    // else { 
    //   setIsLoading(false); 
    // }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount. Dependencies like storeCurrentUser are tricky here due to Zustand.
          // The goal is an initial check. Subsequent updates to storeCurrentUser will flow through context.


  // The login, logout, setCurrentUser functions will now call Zustand actions
  const contextValue: AuthContextType = {
    currentUser: storeCurrentUser,
    isAuthenticated: storeIsAuthenticated,
    isLoading,
    setToken: storeActions.setToken, // Expose setToken
    login: storeActions.login,
    logout: storeActions.logout,
    setCurrentUser: storeActions.setCurrentUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
