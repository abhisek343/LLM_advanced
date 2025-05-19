import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getCandidateMessages, markMessagesAsRead, markMessagesAsUnread } from '../../../services/candidateAPI'; // Added markMessagesAsUnread
import type { Message } from '../../../services/candidateAPI';
import styles from './CandidateMessagesPage.module.css';
import Button from '../../../components/common/Button/Button'; // Assuming a common Button component exists

const CandidateMessagesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const MESSAGES_PER_PAGE = 10; // Define how many messages per page

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser || currentUser.role !== 'candidate') return; // Add role check
      setIsLoading(true);
      setError(null);
      setSelectedMessage(null); 
      try {
        const params: { unread?: boolean; skip?: number; limit?: number } = {
          skip: currentPage * MESSAGES_PER_PAGE,
          limit: MESSAGES_PER_PAGE,
        };
        if (filterType === 'unread') {
          params.unread = true;
        }
        
        const data = await getCandidateMessages(params);
        // Backend should ideally handle sorting, but client-side sort as fallback
        data.sort((a: Message, b: Message) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
        setMessages(data);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load messages.');
        setMessages([]); // Clear messages on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [currentUser, filterType, currentPage]);

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.read_status) {
      try {
        await markMessagesAsRead([message.id]);
        // Update message in local state to reflect read status
        setMessages(prevMessages =>
          prevMessages.map(m =>
            m.id === message.id ? { ...m, read_status: true, read_at: new Date().toISOString() } : m
          )
        );
      } catch (err) {
        console.error('Failed to mark message as read:', err);
        // Optionally show an error to the user
      }
    }
  };

  const handleMarkAsUnread = async (messageId: string) => {
    if (!selectedMessage || selectedMessage.id !== messageId) return; // Ensure correct message is targeted

    try {
      await markMessagesAsUnread([messageId]);
      // Update message in local state
      setMessages(prevMessages =>
        prevMessages.map(m =>
          m.id === messageId ? { ...m, read_status: false, read_at: null } : m
        )
      );
      // Update selected message as well if it's the one being marked unread
      setSelectedMessage(prev => prev && prev.id === messageId ? {...prev, read_status: false, read_at: null} : prev);
      // Optionally, provide user feedback e.g. a toast message
    } catch (err) {
      console.error('Failed to mark message as unread:', err);
      setError('Failed to update message status. Please try again.');
    }
  };

  if (isLoading && messages.length === 0) { // Show loading only if no messages are displayed yet
    return <MainLayout><div>Loading messages...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.messagesContainer}>
        <h1>My Messages</h1>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.filterControls}>
          <button 
            onClick={() => setFilterType('all')} 
            className={filterType === 'all' ? styles.activeFilter : ''}
            disabled={isLoading}
          >
            All Messages
          </button>
          <button 
            onClick={() => setFilterType('unread')} 
            className={filterType === 'unread' ? styles.activeFilter : ''}
            disabled={isLoading}
          >
            Unread Messages
          </button>
        </div>
        
        <div className={styles.messagesLayout}>
          <div className={styles.messageListPane}>
            {isLoading && <p>Loading messages...</p>}
            {!isLoading && messages.length === 0 && <p>No messages found for the current filter.</p>}
            <ul>
              {messages.map(msg => (
                <li 
                  key={msg.id} 
                  onClick={() => handleSelectMessage(msg)}
                  className={`${styles.messageItem} ${selectedMessage?.id === msg.id ? styles.selected : ''} ${!msg.read_status ? styles.unread : ''}`}
                >
                  <div className={styles.sender}>{msg.sender_username || msg.sender_id}</div>
                  <div className={styles.subject}>{msg.subject}</div>
                  <div className={styles.snippet}>{msg.content.substring(0, 50)}{msg.content.length > 50 ? '...' : ''}</div>
                  <div className={styles.date}>{new Date(msg.sent_at).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
            <div className={styles.paginationControls}>
              <Button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0 || isLoading}
                variant="secondary"
                size="small"
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>Page {currentPage + 1}</span>
              <Button
                onClick={() => setCurrentPage(prev => messages.length < MESSAGES_PER_PAGE ? prev : prev + 1)}
                disabled={messages.length < MESSAGES_PER_PAGE || isLoading}
                variant="secondary"
                size="small"
              >
                Next
              </Button>
            </div>
          </div>

          <div className={styles.messageViewPane}>
            {selectedMessage ? (
              <>
                <h2>{selectedMessage.subject}</h2>
                <p className={styles.messageInfo}>
                  <strong>From:</strong> {selectedMessage.sender_username || selectedMessage.sender_id} <br />
                  <strong>Date:</strong> {new Date(selectedMessage.sent_at).toLocaleString()}
                </p>
                <div className={styles.messageActions}>
                  {selectedMessage.read_status && (
                    <Button onClick={() => handleMarkAsUnread(selectedMessage.id)} variant="secondary" size="small">
                      Mark as Unread
                    </Button>
                  )}
                  {/* Placeholder for other actions like Delete if implemented */}
                </div>
                <div className={styles.messageContent} dangerouslySetInnerHTML={{ __html: selectedMessage.content.replace(/\n/g, '<br />') }}></div>
              </>
            ) : (
              <p className={styles.noMessageSelected}>Select a message to view its content.</p>
            )}
          </div>
        </div>
        <Link to="/candidate/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default CandidateMessagesPage;
