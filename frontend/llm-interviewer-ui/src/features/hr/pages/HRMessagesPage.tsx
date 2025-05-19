import React, { useState } from 'react'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './HRMessagesPage.module.css';
import hrService, { type MessageOut } from '../../../services/hrService'; // MessageContentCreate removed
import { useAuth } from '../../../contexts/AuthContext';
import Spinner from '../../../components/common/Spinner';
import AlertMessage from '../../../components/common/AlertMessage';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';

const HR_MESSAGES_QUERY_KEY = 'hrMessages';

const HRMessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser, isLoading: isLoadingAuth } = useAuth();
  const [selectedMessage, setSelectedMessage] = useState<MessageOut | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'compose' | 'reply'>('compose');
  const [replyToMessage, setReplyToMessage] = useState<MessageOut | null>(null);
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [messageActionError, setMessageActionError] = useState<string | null>(null);


  const { 
    data: messages, 
    isLoading: isLoadingMessages, 
    error: messagesError,
  } = useQuery<MessageOut[], Error>({
    queryKey: [HR_MESSAGES_QUERY_KEY, currentUser?.id],
    queryFn: () => hrService.getMessages(),
    enabled: !!currentUser && !isLoadingAuth,
  });

  const { mutate: markAsReadMutate, isPending: isMarkingAsRead } = useMutation<
    { success: boolean },
    Error,
    string[] // messageIds
  >({
    mutationFn: (messageIds) => hrService.markMessagesAsRead(messageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HR_MESSAGES_QUERY_KEY, currentUser?.id] });
    },
    onError: (error) => {
      // Handle error, e.g., show a toast notification
      console.error("Failed to mark message(s) as read:", error.message);
      alert("Error: Could not mark message as read. " + error.message);
    },
  });

  const { mutate: sendMessageMutate, isPending: isSendingMessage } = useMutation<
    MessageOut, // Assuming this is the response type for sending a message
    Error,
    { recipientId: string; subject: string; content: string } // Define variables for sending
  >({
    mutationFn: (vars) => hrService.sendMessageToUser(vars.recipientId, { subject: vars.subject, content: vars.content }),
    onSuccess: () => {
      alert("Message sent successfully!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [HR_MESSAGES_QUERY_KEY, currentUser?.id] });
      // Reset form
      setNewMessageSubject('');
      setNewMessageContent('');
      setReplyToMessage(null);
      setMessageActionError(null);
    },
    onError: (error) => setMessageActionError("Failed to send message: " + error.message),
  });


  const handleSelectMessage = (message: MessageOut) => {
    setSelectedMessage(message);
    // Mark as read if not already read and not currently being marked
    if (!message.read_status && !isMarkingAsRead) { // Changed from !message.read_at
      markAsReadMutate([message.id]);
    }
  };
  
  const handleOpenComposeModal = () => {
    setModalMode('compose');
    setNewMessageSubject('');
    setNewMessageContent('');
    setReplyToMessage(null);
    setMessageActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenReplyModal = (message: MessageOut) => {
    if (!message.sender_id) { // Cannot reply if sender_id is missing (e.g. system message)
        alert("Cannot reply to this message.");
        return;
    }
    setModalMode('reply');
    setReplyToMessage(message);
    setNewMessageSubject(`Re: ${message.subject}`);
    setNewMessageContent(`\n\n--- Original Message ---\nFrom: ${message.sender_info?.username || message.sender_id}\nSubject: ${message.subject}\n\n${message.content}`);
    setMessageActionError(null);
    setIsModalOpen(true);
  };
  
  const handleSendMessage = () => {
    if (!newMessageSubject.trim() || !newMessageContent.trim()) {
        setMessageActionError("Subject and content are required.");
        return;
    }

    let recipientId: string | undefined;
    if (modalMode === 'reply' && replyToMessage?.sender_id) {
        recipientId = replyToMessage.sender_id;
    } else if (modalMode === 'compose' && currentUser?.admin_manager_id) {
        recipientId = currentUser.admin_manager_id;
    } else if (modalMode === 'compose' && !currentUser?.admin_manager_id) {
        setMessageActionError("Cannot compose message: No Admin Manager assigned to your profile.");
        return;
    }


    if (!recipientId) {
        setMessageActionError("Recipient could not be determined.");
        return;
    }
    
    sendMessageMutate({
        recipientId: recipientId,
        subject: newMessageSubject,
        content: newMessageContent,
    });
  };


  if (isLoadingAuth || isLoadingMessages) {
    return <div className={styles.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}><Spinner size="large" /><p>Loading messages...</p></div>;
  }

  if (messagesError) {
    return <div className={styles.pageContainer}><AlertMessage type="error" message={`Error loading messages: ${messagesError.message}`} /></div>;
  }

  const sortedMessages = messages ? [...messages].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()) : [];
  const unreadCount = sortedMessages.filter(m => !m.read_status).length; // Changed from !m.read_at

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>HR Messages</h1>
        <Button onClick={handleOpenComposeModal} disabled={!currentUser?.admin_manager_id && modalMode === 'compose'}>
          Compose New Message
        </Button>
      </header>

      <div className={styles.messagesLayout}>
        <aside className={styles.messageListContainer}>
          <h2>Inbox ({unreadCount} unread)</h2>
          {sortedMessages.length === 0 ? (
            <p>No messages.</p>
          ) : (
            <ul className={styles.messageList}>
              {sortedMessages.map(msg => (
                <li 
                  key={msg.id} 
                  className={`${styles.messageItem} ${selectedMessage?.id === msg.id ? styles.selected : ''} ${!msg.read_status ? styles.unread : ''}`} // Changed from !msg.read_at
                  onClick={() => handleSelectMessage(msg)}
                >
                  <div className={styles.messageSubject}>{msg.subject}</div>
                  <div className={styles.messageSender}>From: {msg.sender_info?.username || msg.sender_id || 'Unknown Sender'}</div>
                  <div className={styles.messageDate}>{new Date(msg.sent_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className={styles.messageViewContainer}>
          {selectedMessage ? (
            <>
              <h2 className={styles.messageViewHeader}>{selectedMessage.subject}</h2>
              <div className={styles.messageViewMeta}>
                <p><strong>From:</strong> {selectedMessage.sender_info?.username || selectedMessage.sender_id || 'Unknown Sender'}</p>
                <p><strong>Date:</strong> {new Date(selectedMessage.sent_at).toLocaleString()}</p>
              </div>
              <div className={styles.messageViewContent}>
                {selectedMessage.content.split('\n').map((line: string, index: number) => (
                  <React.Fragment key={index}>{line}<br/></React.Fragment>
                ))}
              </div>
              {selectedMessage.sender_id && 
                <Button onClick={() => handleOpenReplyModal(selectedMessage)} className={styles.replyButton}>Reply</Button>
              }
            </>
          ) : (
            <div className={styles.noMessageSelected}>
              <p>Select a message to view its content.</p>
            </div>
          )}
        </main>
      </div>
      
      {isModalOpen && (
        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title={modalMode === 'compose' ? "Compose New Message" : `Reply to: ${replyToMessage?.subject || 'Message'}`}
        >
            {messageActionError && <AlertMessage type="error" message={messageActionError} closable onClose={() => setMessageActionError(null)} />}
            
            {modalMode === 'compose' && !currentUser?.admin_manager_id && (
                 <AlertMessage type="warning" message="You are not currently mapped to an Admin Manager. Messages can only be composed to your Admin Manager." />
            )}

            <Input 
                label="Subject" 
                value={newMessageSubject} 
                onChange={e => setNewMessageSubject(e.target.value)} 
                disabled={isSendingMessage || (modalMode === 'compose' && !currentUser?.admin_manager_id)} 
            />
            <Textarea 
                label="Content" 
                value={newMessageContent} 
                onChange={e => setNewMessageContent(e.target.value)} 
                rows={10} 
                disabled={isSendingMessage || (modalMode === 'compose' && !currentUser?.admin_manager_id)} 
            />
            <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <Button onClick={() => setIsModalOpen(false)} variant="secondary" disabled={isSendingMessage}>Cancel</Button>
                <Button 
                    onClick={handleSendMessage} 
                    isLoading={isSendingMessage} 
                    disabled={isSendingMessage || (modalMode === 'compose' && !currentUser?.admin_manager_id)}
                >
                    Send
                </Button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default HRMessagesPage;
