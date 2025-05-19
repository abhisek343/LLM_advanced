import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../../frontend/llm-interviewer-ui/src/components/layout/Header'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the useAuth hook
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  ...jest.requireActual('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'), // Keep actual AuthProvider for other potential uses
  useAuth: jest.fn(),
}));

// Define a UserDetails type for mocks, mirroring the one in AuthContext.tsx
interface MockUserDetails {
  id: string;
  username: string;
  email: string;
  role: 'candidate' | 'hr' | 'admin';
}

// Helper to render Header, useAuth mock will be set in tests
const renderHeader = () => {
  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  const useAuthMock = useAuth as jest.Mock;

  beforeEach(() => {
    mockNavigate.mockClear();
    useAuthMock.mockClear();
  });

  // Test 1: Logo
  it('should correctly display the application logo and link to /', () => {
    useAuthMock.mockReturnValue({ currentUser: null, logout: jest.fn() });
    renderHeader();
    const logoLink = screen.getByText('LLM Interviewer');
    expect(logoLink).toBeInTheDocument();
    expect(logoLink.closest('a')).toHaveAttribute('href', '/');
  });

  // Test 2: Logged out state
  describe('When user is not logged in', () => {
    it('should display Login and Register links', () => {
      useAuthMock.mockReturnValue({ currentUser: null, logout: jest.fn() });
      renderHeader();
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.getByText('Login').closest('a')).toHaveAttribute('href', '/login');
      expect(screen.getByText('Register').closest('a')).toHaveAttribute('href', '/register');
    });
  });

  // Test 3: Logged in state - Common elements
  describe('When user is logged in', () => {
    const mockUser: MockUserDetails = { id: '1', username: 'testuser', role: 'candidate', email: 'test@example.com' };
    const mockLogout = jest.fn();

    beforeEach(() => {
      mockLogout.mockClear();
      useAuthMock.mockReturnValue({ currentUser: mockUser, logout: mockLogout });
    });

    it('should display user welcome message and role', () => {
      renderHeader();
      expect(screen.getByText(`Welcome, ${mockUser.username} (${mockUser.role})`)).toBeInTheDocument();
    });

    it('should toggle user menu dropdown on click', () => {
      renderHeader();
      const userMenuButton = screen.getByText(`Welcome, ${mockUser.username} (${mockUser.role})`);
      fireEvent.click(userMenuButton);
      expect(screen.getByText('Account')).toBeVisible();
      expect(screen.getByText('Settings')).toBeVisible();
      expect(screen.getByText('Logout')).toBeVisible();
      fireEvent.click(userMenuButton); // Close
      expect(screen.queryByText('Account')).not.toBeVisible();
    });
    
    it('should close dropdown when clicking outside', () => {
      renderHeader();
      const userMenuButton = screen.getByText(`Welcome, ${mockUser.username} (${mockUser.role})`);
      fireEvent.click(userMenuButton); // Open dropdown
      expect(screen.getByText('Account')).toBeVisible();
    
      fireEvent.mouseDown(document.body); // Click outside
      // Use queryByText for elements that might not be in the DOM
      expect(screen.queryByText('Account')).not.toBeVisible();
    });


    it('should have "Settings" link in dropdown navigating to /settings', () => {
      renderHeader();
      fireEvent.click(screen.getByText(`Welcome, ${mockUser.username} (${mockUser.role})`));
      const settingsLink = screen.getByText('Settings');
      expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings');
      fireEvent.click(settingsLink); // This should also close the dropdown
      expect(screen.queryByText('Account')).not.toBeVisible(); 
    });

    it('should handle logout functionality', () => {
      renderHeader();
      fireEvent.click(screen.getByText(`Welcome, ${mockUser.username} (${mockUser.role})`)); // Open dropdown
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(screen.queryByText('Account')).not.toBeVisible(); // Dropdown should close
    });
  });

  // Test 4: Role-specific navigation and Account links
  describe('Role-specific navigation and Account links', () => {
    const testCases: { role: 'candidate' | 'hr' | 'admin'; navLinks: string[]; accountLink: string; navLinkHrefs: string[] }[] = [
      {
        role: 'candidate',
        navLinks: ['Dashboard', 'Messages', 'My Interviews'],
        accountLink: '/candidate/profile',
        navLinkHrefs: ['/candidate/dashboard', '/candidate/messages', '/candidate/interviews']
      },
      {
        role: 'hr',
        navLinks: ['Dashboard', 'Messages', 'Admin Connections', 'Search Candidates'],
        accountLink: '/hr/profile',
        navLinkHrefs: ['/hr/dashboard', '/hr/messages', '/hr/admin-connections', '/hr/search-candidates']
      },
      {
        role: 'admin',
        navLinks: ['Dashboard', 'User Management', 'HR Management', 'System Statistics'],
        accountLink: '/admin/account-settings', // As per Header.tsx logic
        navLinkHrefs: ['/admin/dashboard', '/admin/users', '/admin/hr-management', '/admin/stats']
      },
    ];

    testCases.forEach(({ role, navLinks, accountLink, navLinkHrefs }) => {
      it(`should display correct nav links and Account link for ${role} role`, () => {
        const user: MockUserDetails = { id: '1', username: `test${role}`, role, email: `${role}@example.com` };
        useAuthMock.mockReturnValue({ currentUser: user, logout: jest.fn() });
        renderHeader();

        // Check nav links
        navLinks.forEach((linkText, index) => {
          const navLinkElement = screen.getByText(linkText);
          expect(navLinkElement).toBeInTheDocument();
          expect(navLinkElement.closest('a')).toHaveAttribute('href', navLinkHrefs[index]);
        });
        
        // Check Account link in dropdown
        fireEvent.click(screen.getByText(`Welcome, ${user.username} (${user.role})`));
        const accountDropdownLink = screen.getByText('Account');
        expect(accountDropdownLink.closest('a')).toHaveAttribute('href', accountLink);
      });
    });
  });
});
