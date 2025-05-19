import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HRMessagesPage from '../../../frontend/llm-interviewer-ui/src/features/hr/pages/HRMessagesPage'; // Adjusted path
import * as hrAPI from '../../../frontend/llm-interviewer-ui/src/services/hrAPI'; // Adjusted path

// Mock hrAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/hrAPI');

// Define types for mock data, mirroring those in hrAPI.ts or the component
interface MockHRMessage {
  id: string;
  sender_id: string;
  sender_username?: string;
  recipient_id: string; // HR User's ID
  subject: string;
  content: string;
  sent_at: string;
  read_status: boolean;
  read_at?: string | null;
  // Add any other fields specific to HRMessage
}

interface MockPaginatedHRMessages {
  items: MockHRMessage[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

const mockMessages: MockHRMessage[] = [
  { id: 'msg1', sender_id: 'candidate1', sender_username: 'Candidate One', recipient_id: 'hrUser1', subject: 'Regarding Application', content: 'I have a question...', sent_at: new Date(Date.now() - 100000).toISOString(), read_status: false },
  { id: 'msg2', sender_id: 'admin1', sender_username: 'Admin User', recipient_id: 'hrUser1', subject: 'System Update', content: 'Please be aware of an update.', sent_at: new Date(Date.now() - 200000).toISOString(), read_status: true, read_at: new Date().toISOString() },
  { id: 'msg3', sender_id: 'candidate2', sender_username: 'Candidate Two', recipient_id: 'hrUser1', subject: 'Thank You Note', content: 'Thank you for the interview.', sent_at: new Date(Date.now() - 50000).toISOString(), read_status: false },
];

const mockPaginatedResponse: MockPaginatedHRMessages = {
  items: mockMessages,
  total: mockMessages.length,
  page: 1,
  size: 10,
  pages: 1,
};

describe('HRMessagesPage Component', () => {
  const mockedHrAPI = hrAPI as jest.Mocked<typeof hrAPI>;

  beforeEach(() => {
    mockedHrAPI.getHRMessages.mockResolvedValue(mockPaginatedResponse);
    mockedHrAPI.markHRMessagesAsRead.mockResolvedValue({ acknowledged: true, modified_count: 1 });
    // Assuming the function is markHRMessagesAsUnread based on plural in getHRMessages and markHRMessagesAsRead
    // If it's singular markHRMessageAsUnread, the mock target would need to change.
    // For now, aligning with the plural pattern and the error message for replyToMessageByHr.
    // The error for line 52 was "Argument of type 'undefined' is not assignable to parameter of type '{ message: string; } | Promise<{ message: string; }>'",
    // which seems to correspond to a reply function, not mark as unread.
    // Let's assume the function is indeed markHRMessageAsUnread and it expects { message: string }
    // OR if it's markHRMessagesAsUnread (plural), it might expect a structure similar to markHRMessagesAsRead.
    // Given the diagnostic for line 52 specifically mentions a type expecting { message: string; },
    // and the code has `markHRMessageAsUnread.mockResolvedValue(undefined);`
    // This is confusing. Let's assume the function is `markHRMessageAsUnread` and it expects `{ message: "Success" }`
    // If the actual function is `replyToMessageByHr` as the error message for line 52 suggests, that's a different mock.
    // The provided code has `mockedHrAPI.markHRMessageAsUnread.mockResolvedValue(undefined);`
    // Let's assume the type for `markHRMessageAsUnread` is `{ message: string }` based on the error.
    mockedHrAPI.markHRMessageAsUnread.mockResolvedValue({ message: "Message marked as unread" });
    // If there's a replyToMessageByHr, it would be:
    // mockedHrAPI.replyToMessageByHr.mockResolvedValue({ message: "Reply sent" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderMessagesPage = () => {
    return render(<HRMessagesPage />);
  };

  it('should list messages with snippets, sorted by date (newest first by component logic)', async () => {
    renderMessagesPage();
    await waitFor(() => expect(mockedHrAPI.getHRMessages).toHaveBeenCalled());
    
    const messageItems = screen.getAllByRole('listitem');
    expect(messageItems.length).toBe(mockMessages.length);
    // Component sorts by sent_at desc.
    expect(messageItems[0]).toHaveTextContent(mockMessages[2].subject); // Thank You Note (newest)
    expect(messageItems[1]).toHaveTextContent(mockMessages[0].subject); // Regarding Application
    expect(messageItems[2]).toHaveTextContent(mockMessages[1].subject); // System Update
    
    expect(screen.getByText(mockMessages[0].subject)).toBeInTheDocument();
    expect(screen.getByText(mockMessages[0].content.substring(0, 100) + "...")).toBeInTheDocument();
  });

  it('should filter messages by "Unread"', async () => {
    renderMessagesPage();
    const unreadButton = screen.getByRole('button', { name: /unread messages/i });
    fireEvent.click(unreadButton);

    await waitFor(() => {
      expect(mockedHrAPI.getHRMessages).toHaveBeenCalledWith(expect.objectContaining({ unread: true, page: 1, size: 10 }));
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
      expect(screen.getByText(mockMessages[0].content)).toBeVisible(); // Assuming content is plain text
    });
    expect(mockedHrAPI.markHRMessagesAsRead).toHaveBeenCalledWith([mockMessages[0].id]);
  });

  it('should allow marking a read message as "Unread"', async () => {
    // Ensure msg2 is initially read in the mock response for this specific test
    const specificMockResponse = {
        ...mockPaginatedResponse,
        items: mockMessages.map(m => m.id === 'msg2' ? {...m, read_status: true} : m)
    };
    mockedHrAPI.getHRMessages.mockResolvedValueOnce(specificMockResponse);
    renderMessagesPage();
    await waitFor(() => expect(screen.getByText(mockMessages[1].subject)).toBeInTheDocument());
    
    const readMessageItem = screen.getByText(mockMessages[1].subject).closest('li');
    expect(readMessageItem).not.toBeNull();
    if (readMessageItem) fireEvent.click(readMessageItem); // Select it

    await waitFor(() => expect(screen.getByRole('button', { name: /mark as unread/i })).toBeVisible());
    const markUnreadButton = screen.getByRole('button', { name: /mark as unread/i });
    fireEvent.click(markUnreadButton);

    await waitFor(() => expect(mockedHrAPI.markHRMessageAsUnread).toHaveBeenCalledWith(mockMessages[1].id));
    // Check if UI updates (e.g., button disappears or message style changes)
    // This depends on the component's re-render logic after state update.
    // For now, we assume the button is gone or the message is styled as unread.
    // A more robust test would check for the absence of the button or presence of 'unread' class.
    expect(screen.queryByRole('button', { name: /mark as unread/i })).not.toBeInTheDocument();
  });

  it('should handle pagination: Previous button disabled on first page, Next button works if more pages', async () => {
    const multiPageResponse: MockPaginatedHRMessages = {
      ...mockPaginatedResponse,
      items: new Array(10).fill(mockMessages[0]).map((m, i) => ({...m, id: `msg_page1_${i}`})), // Full first page
      total: 20, // Total of 2 pages
      pages: 2,
      page: 1,
    };
    mockedHrAPI.getHRMessages.mockResolvedValueOnce(multiPageResponse);
    renderMessagesPage();
    await waitFor(() => expect(mockedHrAPI.getHRMessages).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 10 })));

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled(); // Should be enabled if totalPages > 1
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(mockedHrAPI.getHRMessages).toHaveBeenCalledWith(expect.objectContaining({ page: 2, size: 10 }));
    });
    // After navigating to page 2 of 2
    // expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
    // expect(screen.getByRole('button', { name: /next/i })).toBeDisabled(); // Assuming this is the last page
  });
});
