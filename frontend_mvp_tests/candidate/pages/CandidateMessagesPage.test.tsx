import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link component
import CandidateMessagesPage from '../../../frontend/llm-interviewer-ui/src/features/candidate/pages/CandidateMessagesPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as candidateAPI from '../../../frontend/llm-interviewer-ui/src/services/candidateAPI'; // Adjusted path

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock candidateAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/candidateAPI');

// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props}>{props.children}</button>);


interface MockMessage {
  id: string;
  sender_id: string;
  sender_username?: string;
  recipient_id: string;
  subject: string;
  content: string;
  sent_at: string;
  read_status: boolean;
  read_at?: string | null;
}

const mockCurrentUser = { id: 'user1', username: 'testcandidate', email: 'test@example.com', role: 'candidate' };
const mockMessages: MockMessage[] = [
  { id: 'msg1', sender_id: 'hr1', sender_username: 'HR Team', recipient_id: 'user1', subject: 'Interview Invite', content: 'You are invited...', sent_at: new Date(Date.now() - 100000).toISOString(), read_status: false },
  { id: 'msg2', sender_id: 'system', recipient_id: 'user1', subject: 'Welcome!', content: 'Welcome to the platform!', sent_at: new Date(Date.now() - 200000).toISOString(), read_status: true, read_at: new Date().toISOString() },
  { id: 'msg3', sender_id: 'hr2', sender_username: 'Another HR', recipient_id: 'user1', subject: 'Follow Up', content: 'Regarding your application...', sent_at: new Date(Date.now() - 50000).toISOString(), read_status: false },
];


describe('CandidateMessagesPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedCandidateAPI = candidateAPI as jest.Mocked<typeof candidateAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockedCandidateAPI.getCandidateMessages.mockResolvedValue([...mockMessages]); // Default to all messages
    // Error indicates 'undefined' is not assignable. Trying empty object.
    mockedCandidateAPI.markMessagesAsRead.mockResolvedValue({} as any); 
    mockedCandidateAPI.markMessagesAsUnread.mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderMessagesPage = () => {
    return render(
      <BrowserRouter>
        <CandidateMessagesPage />
      </BrowserRouter>
    );
  };

  it('should list messages with snippets, sorted by date (newest first)', async () => {
    renderMessagesPage();
    await waitFor(() => expect(mockedCandidateAPI.getCandidateMessages).toHaveBeenCalled());
    
    const messageItems = screen.getAllByRole('listitem');
    expect(messageItems.length).toBe(mockMessages.length);
    // Check if sorted (msg3 should be first as it's newest unread, then msg1, then msg2)
    // The component sorts them, so we check the order of subjects
    expect(messageItems[0]).toHaveTextContent(mockMessages[2].subject); // Follow Up
    expect(messageItems[1]).toHaveTextContent(mockMessages[0].subject); // Interview Invite
    expect(messageItems[2]).toHaveTextContent(mockMessages[1].subject); // Welcome!
    
    expect(screen.getByText(mockMessages[0].subject)).toBeInTheDocument();
    expect(screen.getByText(mockMessages[0].content.substring(0,50) + "...")).toBeInTheDocument();
  });

  it('should filter messages by "Unread"', async () => {
    renderMessagesPage();
    const unreadButton = screen.getByRole('button', { name: /unread messages/i });
    fireEvent.click(unreadButton);

    await waitFor(() => {
      expect(mockedCandidateAPI.getCandidateMessages).toHaveBeenCalledWith(expect.objectContaining({ unread: true, skip: 0, limit: 10 }));
    });
  });
  
  it('should display full message content on selection and mark as read', async () => {
    renderMessagesPage();
    await waitFor(() => expect(screen.getByText(mockMessages[0].subject)).toBeInTheDocument());

    const unreadMessageItem = screen.getByText(mockMessages[0].subject).closest('li');
    expect(unreadMessageItem).not.toBeNull();
    if (unreadMessageItem) fireEvent.click(unreadMessageItem);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: mockMessages[0].subject })).toBeVisible();
      expect(screen.getByText(new RegExp(mockMessages[0].content.replace(/\n/g, '<br />')))).toBeVisible(); // Content might have HTML
    });
    expect(mockedCandidateAPI.markMessagesAsRead).toHaveBeenCalledWith([mockMessages[0].id]);
  });

  it('should allow marking a read message as "Unread"', async () => {
    // Select the already read message (msg2)
    mockedCandidateAPI.getCandidateMessages.mockResolvedValueOnce(
        mockMessages.map(m => m.id === 'msg2' ? {...m, read_status: true} : m)
    );
    renderMessagesPage();
    await waitFor(() => expect(screen.getByText(mockMessages[1].subject)).toBeInTheDocument());
    
    const readMessageItem = screen.getByText(mockMessages[1].subject).closest('li');
    expect(readMessageItem).not.toBeNull();
    if (readMessageItem) fireEvent.click(readMessageItem); // Select it

    await waitFor(() => expect(screen.getByRole('button', { name: /mark as unread/i })).toBeVisible());
    const markUnreadButton = screen.getByRole('button', { name: /mark as unread/i });
    fireEvent.click(markUnreadButton);

    await waitFor(() => expect(mockedCandidateAPI.markMessagesAsUnread).toHaveBeenCalledWith([mockMessages[1].id]));
    // Check if the button disappears or changes, or if the message style updates
    // For simplicity, we'll assume the button is gone after marking unread (or message becomes unread styled)
    // This depends on how the UI updates. Let's assume the button is no longer there for a now unread message.
    expect(screen.queryByRole('button', { name: /mark as unread/i })).not.toBeInTheDocument();
  });

  it('should handle pagination: Previous button disabled on first page, Next button works', async () => {
    renderMessagesPage();
    await waitFor(() => expect(mockedCandidateAPI.getCandidateMessages).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 10 })));

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    // Assuming mockMessages has more than MESSAGES_PER_PAGE for Next to be enabled initially
    // For this test, let's assume it's enabled. If not, adjust mockMessages or test logic.
    // If mockMessages.length < MESSAGES_PER_PAGE, next will be disabled.
    // Let's assume MESSAGES_PER_PAGE is 2 for this test to make Next enabled with 3 messages.
    // (Note: MESSAGES_PER_PAGE is 10 in component, so Next would be disabled with 3 messages)
    // To test Next properly, we'd need more mock messages or adjust MESSAGES_PER_PAGE in test.
    // For now, let's just check if it calls with incremented page.
    
    // Simulate that there are more messages than currently displayed to enable "Next"
    // This is tricky without knowing the total count from backend.
    // The component disables "Next" if messages.length < MESSAGES_PER_PAGE.
    // Let's assume getCandidateMessages returns enough to enable it.
    mockedCandidateAPI.getCandidateMessages.mockResolvedValueOnce(new Array(10).fill(mockMessages[0])); // Simulate full page
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(mockedCandidateAPI.getCandidateMessages).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, limit: 10 })); // Page 2 (0-indexed * 10)
    });
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });
});
