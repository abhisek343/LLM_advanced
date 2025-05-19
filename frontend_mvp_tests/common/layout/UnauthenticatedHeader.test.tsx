import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import UnauthenticatedHeader from '../../../frontend/llm-interviewer-ui/src/components/layout/UnauthenticatedHeader'; // Adjusted path

// Helper to render UnauthenticatedHeader
const renderUnauthenticatedHeader = () => {
  return render(
    <BrowserRouter>
      <UnauthenticatedHeader />
    </BrowserRouter>
  );
};

describe('UnauthenticatedHeader Component', () => {
  // MVP Feature: Global App Title/Logo on Unauthenticated Pages
  // Implemented: Display global app title/logo on Login and Registration pages.

  it('should display the global application title/logo', () => {
    renderUnauthenticatedHeader();
    const logoElement = screen.getByText('LLM Interviewer');
    expect(logoElement).toBeInTheDocument();
  });

  it('should link the logo to the homepage ("/")', () => {
    renderUnauthenticatedHeader();
    const logoLink = screen.getByText('LLM Interviewer').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  // Based on frontend_implementation_log.md, this component is used on LoginPage.tsx and RegistrationPage.tsx.
  // Further tests could involve rendering it within those parent components to ensure integration,
  // but for unit testing UnauthenticatedHeader itself, the above should suffice.
});
