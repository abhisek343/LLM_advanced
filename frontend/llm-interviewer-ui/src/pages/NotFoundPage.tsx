import React from 'react';
import { Link } from 'react-router-dom';
// import MainLayout from '../components/layout/MainLayout'; // Optional: wrap in MainLayout if desired - Removed
import { useAuth } from '../contexts/AuthContext';

const NotFoundPage: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    // Consider if MainLayout is appropriate here or a simpler layout
    // For now, using a simple div to avoid MainLayout complexities if user is not logged in
    // or if MainLayout itself has dependencies on a valid route.
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for does not exist or has been moved.</p>
      {currentUser ? (
        <Link to="/">Go to Dashboard</Link>
      ) : (
        <Link to="/login">Go to Login</Link>
      )}
    </div>
  );
};

export default NotFoundPage;
