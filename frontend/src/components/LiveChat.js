import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/LiveChat.css';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'; // Import Firestore functions

const LiveChat = ({ user, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const predefinedQuestions = [
    "What is Atlas Core?",
    "How do I link my Minecraft account?",
    "I have an issue with a purchase.",
    "How can I join a town?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Initialize Firestore DB instance for the user side
  // This assumes db is available from the global scope or context (e.g., from App.js)
  const db = getFirestore(); // Assuming db is available from the global scope or context

  // Effect to handle chat window open/close and real-time message listening
  useEffect(() => {
    if (!isOpen || isAdmin || !db) return; // Only run if chat is open, not admin, and db is initialized

    let sessionId;
    if (user) {
      sessionId = user.id;
    } else {
      // For guest users, generate a unique ID if one doesn't exist in session storage
      sessionId = sessionStorage.getItem('guestId');
      if (!sessionId) {
        sessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem('guestId', sessionId);
      }
    }

    // Set up the real-time listener for messages
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date() // Convert Firestore Timestamp to JS Date
      }));

      // If no messages exist for a new session, add an initial greeting from admin
      if (newMessages.length === 0) {
        setMessages([
          {
            sender: 'admin',
            message: `Hello ${user ? user.username : 'Guest'}! How can I help you today?`,
            timestamp: new Date()
          },
        ]);
      } else {
        setMessages(newMessages);
      }
    }, (error) => {
      console.error("Error listening to chat messages (user side):", error);
      // Optionally display an error to the user in the chat window
      setMessages(prev => [...prev, { sender: 'system', message: "Error: Could not load chat messages." }]);
    });

    // Cleanup function: unsubscribe from the listener when the chat window closes
    return () => unsubscribe();

  }, [isOpen, user, isAdmin, db]); // Dependencies for this effect

  const toggleChat = () => {
    if (isAdmin) {
      navigate('/admin/chat');
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleSend = async (text) => {
    if (text.trim() === '') return;

    // Determine session ID for sending
    let sessionId;
    if (user) {
      sessionId = user.id;
    } else {
      sessionId = sessionStorage.getItem('guestId');
      if (!sessionId) {
        // This should theoretically not happen if the useEffect runs first, but as a fallback
        sessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem('guestId', sessionId);
      }
    }

    try {
        const payload = { message: text, userId: sessionId }; // Always send userId for guest too
        if (!user) { // If it's a guest, explicitly send guestId
            payload.guestId = sessionId;
            delete payload.userId; // Ensure userId is not sent for guests
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        await axios.post('http://localhost:5000/api/v1/chat/send', payload, { headers });
        // Messages will be updated by the onSnapshot listener, so no manual update here.
        setInputValue('');
    } catch (error) {
        console.error("Failed to send message:", error);
        // Display error message in chat
        setMessages(prev => [...prev, { sender: 'system', message: "Error: Could not send message."}]);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handlePredefinedQuestionClick = (question) => {
    handleSend(question);
  };

  return (
    <div className={`live-chat-container ${isAdmin ? 'admin' : ''}`}>
      <button className={`chat-toggle-button ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        {isAdmin ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        ) : isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
      </button>

      {isOpen && !isAdmin && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Atlas Core Support</h3>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {/* Display sender name and timestamp */}
                <p className="message-sender">{msg.sender === 'user' ? (user ? user.username : 'You') : 'Admin'}</p>
                <p className="message-content">{msg.text || msg.message}</p>
                {/* FIX: Moved timestamp below message content */}
                <span className="message-timestamp-text">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="predefined-questions">
            {predefinedQuestions.map((q, i) => (
              <button key={i} onClick={() => handlePredefinedQuestionClick(q)}>
                {q}
              </button>
            ))}
          </div>
          <form className="chat-input-form" onSubmit={handleFormSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              autoFocus
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
