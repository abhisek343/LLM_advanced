import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext'; // AuthContext will need to be exported from AuthContext.tsx

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
