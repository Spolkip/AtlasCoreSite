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

  // FIX: Changed to an array of objects to include answers for auto-reply.
  const predefinedQuestions = [
    {
        question: "What is Atlas Core?",
        answer: "Atlas Core is a Minecraft RPG server featuring custom classes, mobs, items, and a towny-based diplomacy system. You can forge your own legend in our world!"
    },
    {
        question: "How do I link my Minecraft account?",
        answer: "You can link your Minecraft account from your Dashboard. Click on your profile, then find the 'Link Minecraft Account' option to start the process."
    },
    {
        question: "I have an issue with a purchase.",
        answer: "We're sorry to hear that. Please describe your issue in detail in the chat, and an admin will be with you shortly to assist."
    },
    {
        question: "How can I join a town?",
        answer: "To join a town, you can use the in-game command `/town join [town_name]`. You can find a list of public towns with `/town list`."
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const db = getFirestore();

  useEffect(() => {
    if (!isOpen || isAdmin || !db) return;

    let sessionId;
    if (user) {
      sessionId = user.id;
    } else {
      sessionId = sessionStorage.getItem('guestId');
      if (!sessionId) {
        sessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem('guestId', sessionId);
      }
    }

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date()
      }));

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
      setMessages(prev => [...prev, { sender: 'system', message: "Error: Could not load chat messages." }]);
    });

    return () => unsubscribe();

  }, [isOpen, user, isAdmin, db]);

  const toggleChat = () => {
    if (isAdmin) {
      navigate('/admin/chat');
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleSend = async (text) => {
    if (text.trim() === '') return;

    let sessionId;
    if (user) {
      sessionId = user.id;
    } else {
      sessionId = sessionStorage.getItem('guestId');
      if (!sessionId) {
        sessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem('guestId', sessionId);
      }
    }

    try {
        const payload = { message: text, userId: sessionId };
        if (!user) {
            payload.guestId = sessionId;
            delete payload.userId;
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        await axios.post('http://localhost:5000/api/v1/chat/send', payload, { headers });
        setInputValue('');
    } catch (error) {
        console.error("Failed to send message:", error);
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

  // FIX: Implement auto-reply logic.
  const handlePredefinedQuestionClick = (questionObj) => {
    const { question, answer } = questionObj;

    // 1. Send the user's question to the backend for the admin to see.
    handleSend(question);

    // 2. Immediately add both the user's question and the system's auto-reply
    //    to the local state for an instant UI update.
    const userMessage = {
        sender: 'user',
        message: question,
        timestamp: new Date()
    };
    const adminReply = {
        sender: 'admin',
        message: answer,
        timestamp: new Date(Date.now() + 500) // Add a slight delay to feel more natural
    };

    // Use the onSnapshot listener to update the UI by adding the messages to Firestore.
    // This is a more robust way to handle real-time updates.
    // The previously implemented onSnapshot listener will then update the UI.
    // We will simulate this by adding the messages to the local state for now.
    setMessages(prev => [...prev, userMessage, adminReply]);
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
                <p className="message-sender">{msg.sender === 'user' ? (user ? user.username : 'You') : 'Admin'}</p>
                <p className="message-content">{msg.text || msg.message}</p>
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
                {q.question}
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
