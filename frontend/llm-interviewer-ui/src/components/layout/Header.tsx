import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Header.module.css';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const getAccountLink = () => {
    if (!currentUser) return '/login';
    switch (currentUser.role) {
      case 'candidate':
        return '/candidate/profile';
      case 'hr':
        return '/hr/profile';
      case 'admin':
        return '/admin/account-settings'; // Or /admin/dashboard or a dedicated admin profile page
      default:
        return '/';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Link to="/" className={styles.logo}>
          LLM Interviewer
        </Link>
      </div>
      <nav className={styles.nav}>
        {currentUser ? (
          <>
            {/* Role-specific navigation links */}
            {currentUser.role === 'candidate' && (
              <>
                <Link to="/candidate/dashboard" className={styles.navLink}>Dashboard</Link>
                <Link to="/candidate/messages" className={styles.navLink}>Messages</Link>
                <Link to="/candidate/interviews" className={styles.navLink}>My Interviews</Link>
              </>
            )}
            {currentUser.role === 'hr' && (
              <>
                <Link to="/hr/dashboard" className={styles.navLink}>Dashboard</Link>
                <Link to="/hr/messages" className={styles.navLink}>Messages</Link>
                <Link to="/hr/admin-connections" className={styles.navLink}>Admin Connections</Link>
                <Link to="/hr/search-candidates" className={styles.navLink}>Search Candidates</Link>
                {/* <Link to="/hr/schedule-interview" className={styles.navLink}>Schedule Interview</Link> */}
                {/* <Link to="/hr/interviews/review" className={styles.navLink}>Review Interviews</Link> */}
              </>
            )}
            {currentUser.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className={styles.navLink}>Dashboard</Link>
                <Link to="/admin/candidate-management" className={styles.navLink}>Candidate Management</Link>
                <Link to="/admin/hr-management" className={styles.navLink}>HR Management</Link>
                <Link to="/admin/stats" className={styles.navLink}>System Statistics</Link>
              </>
            )}

            {/* User Menu Dropdown */}
            <div className={styles.userMenuContainer} ref={dropdownRef}>
              <button onClick={toggleDropdown} className={styles.userMenuButton}>
                Welcome, {currentUser.username} ({currentUser.role})
                <span className={styles.dropdownArrow}>{isDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <Link to={getAccountLink()} className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    Account
                  </Link>
                  <Link to="/settings" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    Settings
                  </Link>
                  <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutButtonDropdown}`}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.navLink}>Login</Link>
            <Link to="/register" className={styles.navLink}>Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
