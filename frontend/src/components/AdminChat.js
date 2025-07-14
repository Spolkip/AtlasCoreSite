import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../css/AdminChat.css';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'; // Import Firestore functions

// FIX: Accept 'db' as a prop from App.js
const AdminChat = ({ user, db }) => { 
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null); // This holds the userId of the selected chat session
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    // FIX: Corrected syntax for config object initialization
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } }; // Corrected line

    // FIX: Removed the local getFirestore() call, now 'db' is passed as a prop
    // const db = getFirestore(); 

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const fetchSessions = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/v1/chat/sessions', config);
            if (data.success) {
                // Filter out any null/undefined sessions before sorting and processing
                const validSessions = data.sessions.filter(s => s != null); // Ensure session object itself is not null/undefined

                // Sort sessions: claimed by current admin, then other claimed, then open, then closed
                const sortedSessions = validSessions.sort((a, b) => {
                    // Add defensive checks for status and claimedBy before accessing
                    const aStatus = a?.status || 'unknown';
                    const bStatus = b?.status || 'unknown';
                    const aClaimedBy = a?.claimedBy;
                    const bClaimedBy = b?.claimedBy;

                    // Closed sessions always last
                    if (aStatus === 'closed' && bStatus !== 'closed') return 1;
                    if (bStatus === 'closed' && aStatus !== 'closed') return -1;

                    // Sessions claimed by me first
                    const aClaimedByMe = aStatus === 'claimed' && aClaimedBy === user?.id; // Use user?.id
                    const bClaimedByMe = bStatus === 'claimed' && bClaimedBy === user?.id; // Use user?.id
                    if (aClaimedByMe && !bClaimedByMe) return -1;
                    if (bClaimedByMe && !aClaimedByMe) return 1;

                    // Other claimed sessions next
                    if (aStatus === 'claimed' && bStatus === 'active') return -1;
                    if (bStatus === 'claimed' && aStatus === 'active') return 1;

                    // Sort by most recent message otherwise
                    const aTimestamp = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp) : new Date(0);
                    const bTimestamp = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp) : new Date(0);
                    return bTimestamp - aTimestamp;
                });

                setSessions(sortedSessions);
                // If a session was selected and its status changed to closed, deselect it
                if (selectedSession) {
                    const updatedSession = sortedSessions.find(s => s.userId === selectedSession);
                    if (updatedSession && updatedSession.status === 'closed') {
                        setSelectedSession(null);
                        setMessages([]);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load chat sessions:', err);
            setError('Failed to load chat sessions. Make sure you are logged in as an admin and the server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions(); // Fetch immediately on mount

        // Poll for new sessions every 5 seconds
        const intervalId = setInterval(fetchSessions, 5000);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, [user?.id, selectedSession]); // Depend on user.id and selectedSession for real-time updates of session list and current chat

    // Effect for real-time message listening
    useEffect(() => {
        if (!selectedSession || !db) return; // Ensure a session is selected and Firestore is initialized

        // Create a query to listen to messages for the selected session, ordered by timestamp
        const q = query(
            collection(db, 'chats'),
            where('userId', '==', selectedSession),
            orderBy('timestamp', 'asc')
        );

        // Set up the real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date() // Convert Firestore Timestamp to JS Date
            }));
            setMessages(newMessages);
            setError(''); // Clear any previous errors related to message loading
        }, (error) => {
            console.error("Error listening to chat messages:", error);
            setError("Failed to load real-time messages for this session.");
        });

        // Cleanup function: unsubscribe from the listener when the component unmounts
        // or when selectedSession changes (to listen to a different chat)
        return () => unsubscribe();
    }, [selectedSession, db]); // Re-run effect when selectedSession or db changes


    const handleSelectSession = async (userId) => {
        setSelectedSession(userId);
        // No need to fetch history via Axios here, as the onSnapshot listener above will handle it.
        // We just need to set the selectedSession, and the useEffect will trigger the listener.
        setMessages([]); // Clear messages immediately to show loading state for new session
        setError(''); // Clear previous errors
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedSession) return;

        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/send', {
                userId: selectedSession, // Send message to the currently selected user session
                message: newMessage,
                // sender is 'admin' by default on backend if admin token is used
            }, config);

            if (data.success) {
                // Messages will be updated by the onSnapshot listener, so no need to manually add here.
                setNewMessage('');
                // Optionally refetch sessions to update last message/timestamp in the sidebar list
                fetchSessions();
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError(err.response?.data?.message || 'Failed to send message.');
        }
    };

    const handleClaimChat = async (sessionUserId) => {
        if (!user || !user.id) { // Ensure admin user is logged in
            setError('Admin user information not available. Cannot claim chat.');
            return;
        }
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/claim', { userId: sessionUserId }, config);
            if (data.success) {
                // alert(data.message); // Replaced with a more React-friendly notification if needed
                // The onSnapshot listener will pick up the system message from the backend
                fetchSessions(); // Refresh sessions to show claimed status
            } else {
                setError(data.message || 'Failed to claim chat.');
            }
        } catch (err) {
            console.error('Error claiming chat:', err);
            setError(err.response?.data?.message || 'Server error claiming chat.');
        }
    };

    const handleCloseChat = async (sessionUserId) => {
        // Using a custom modal/dialog is preferred over window.confirm for better UX.
        // For now, keeping window.confirm as per existing pattern.
        if (!window.confirm('Are you sure you want to close this chat session?')) {
            return;
        }
        if (!user || !user.id) { // Ensure admin user is logged in
            setError('Admin user information not available. Cannot close chat.');
            return;
        }
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/chat/close', { userId: sessionUserId }, config);
            if (data.success) {
                // alert(data.message); // Replaced with a more React-friendly notification if needed
                fetchSessions(); // Refresh sessions to remove closed chat
                setSelectedSession(null); // Deselect the closed chat
                setMessages([]); // Clear messages
            } else {
                setError(data.message || 'Failed to close chat.');
            }
        } catch (err) {
            console.error('Error closing chat:', err);
            setError(err.response?.data?.message || 'Server error closing chat.');
        }
    };


    if (loading) return <div className="loading-container">Loading chat sessions...</div>;
    if (error && sessions.length === 0) return <div className="error-container">{error}</div>;

    // Get the full session object for the currently selected chat from the sessions state
    const currentChatSession = selectedSession ? sessions.find(s => s.userId === selectedSession) : null;
    const isClaimedByMe = currentChatSession && currentChatSession.status === 'claimed' && currentChatSession.claimedBy === user?.id;
    const isClaimedByOther = currentChatSession && currentChatSession.status === 'claimed' && currentChatSession.claimedBy !== user?.id;
    const isClosed = currentChatSession && currentChatSession.status === 'closed';


    return (
        <div className="admin-chat-container">
            <div className="session-list">
                <h2>Active Chats ({sessions.filter(s => s != null && s.status !== 'closed').length})</h2> {/* Added null check */}
                {error && <div className="auth-error-message">{error}</div>}
                {sessions.length > 0 ? sessions.map(session => (
                    // Add null check before rendering each session item
                    session && session.userId && ( // Ensure session.userId exists as key
                        <div
                            key={session.userId}
                            className={`session-item 
                                ${selectedSession === session.userId ? 'active' : ''}
                                ${session.status === 'claimed' ? 'claimed' : ''}
                                ${session.claimedBy === user?.id ? 'claimed-by-me' : ''}
                                ${session.status === 'closed' ? 'closed' : ''}
                            `}
                            onClick={() => handleSelectSession(session.userId)}
                        >
                            <p className="session-username">
                                {session.username} 
                                {session.status === 'claimed' && session.claimedBy === user?.id && <span className="session-tag claimed-by-me-tag"> (Claimed by You)</span>}
                                {session.status === 'claimed' && session.claimedBy !== user?.id && <span className="session-tag claimed-tag"> (Claimed by {session.claimedByUsername})</span>}
                                {session.status === 'closed' && <span className="session-tag closed-tag"> (Closed)</span>}
                            </p>
                            <p className="session-last-message">
                                {session.lastMessage}
                                <span className="message-timestamp">
                                    {session.lastMessageTimestamp ? new Date(session.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                            </p>
                            <div className="session-actions">
                                {session.status === 'active' && (
                                    <button className="mc-button small primary" onClick={(e) => {e.stopPropagation(); handleClaimChat(session.userId);}}>Claim</button>
                                )}
                                {session.status === 'claimed' && session.claimedBy === user?.id && (
                                    <button className="mc-button small danger" onClick={(e) => {e.stopPropagation(); handleCloseChat(session.userId);}}>Close Ticket</button> 
                                )}
                                {session.status === 'claimed' && session.claimedBy !== user?.id && ( // Only show if claimed by OTHER admin
                                    <span className="claimed-info">Claimed by {session.claimedByUsername}</span>
                                )}
                                {session.status === 'closed' && (
                                    <span className="closed-info">This chat is closed.</span>
                                )}
                            </div>
                        </div>
                    )
                )) : (
                    <p className="no-sessions-message">No active conversations.</p>
                )}
            </div>
            <div className="chat-area">
                {currentChatSession ? (
                    <>
                        <div className="chat-header">
                            <h3>Chat with {currentChatSession.username}</h3>
                            <div className="chat-actions">
                                {currentChatSession.status === 'active' && (
                                    <button className="mc-button primary small" onClick={() => handleClaimChat(selectedSession)}>Claim Chat</button>
                                )}
                                {currentChatSession.status === 'claimed' && isClaimedByMe && (
                                    <button className="mc-button danger small" onClick={(e) => {e.stopPropagation(); handleCloseChat(selectedSession);}}>Close Ticket</button> 
                                )}
                                {isClaimedByOther && (
                                    <span className="claimed-info">Claimed by {currentChatSession.claimedByUsername}</span>
                                )}
                                {isClosed && (
                                    <span className="closed-info">This chat is closed.</span>
                                )}
                            </div>
                        </div>
                        {error && <div className="auth-error-message">{error}</div>}
                        <div className="chat-messages admin-chat-messages">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message ${msg.sender}`}>
                                    {/* Display sender name */}
                                    <p className="message-sender">{msg.sender === 'user' ? currentChatSession.username : (msg.sender === 'admin' ? 'You (Admin)' : 'System')}</p>
                                    <p className="message-content">{msg.message}</p>
                                    {/* FIX: Moved timestamp below message content */}
                                    <span className="message-timestamp-text">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={isClosed ? "Chat is closed." : (isClaimedByOther ? "Chat is claimed by another admin." : "Reply to user...")}
                                autoFocus
                                disabled={isClosed || isClaimedByOther}
                            />
                            <button type="submit" disabled={isClosed || isClaimedByOther}>Send</button>
                        </form>
                    </>
                ) : (
                    <div className="no-session-selected">
                        <p>Select a session to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChat;
