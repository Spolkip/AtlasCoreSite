// frontend/src/components/Events.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Events.css';

const Events = ({ user }) => {
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/events');
      if (response.data.success) {
        // Ensure dates are parsed correctly
        const fetchedEvents = response.data.events.map(event => ({
          ...event,
          date: new Date(event.date) // Convert date string to Date object
        }));
        setEventsData(fetchedEvents);
      } else {
        setError(response.data.message || 'Failed to fetch events.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while fetching events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setSelectedEvent(null); // Close modal when changing month
    setCurrentMonth(prev => (prev === 0 ? 11 : prev - 1));
    if (currentMonth === 0) setCurrentYear(prev => prev - 1);
  };

  const handleNextMonth = () => {
    setSelectedEvent(null); // Close modal when changing month
    setCurrentMonth(prev => (prev === 11 ? 0 : prev + 1));
    if (currentMonth === 11) setCurrentYear(prev => prev + 1);
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStringForComparison = new Date(currentYear, currentMonth, day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const dayEvents = eventsData.filter(event => 
        event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) === dateStringForComparison
      );

      days.push(
        <div key={`day-${day}`} className="calendar-day">
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className={"event-title-calendar event-" + event.type}
                onClick={() => setSelectedEvent(event)}>
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  if (loading) return <div className="loading-container">Loading Events...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="events-container">
      {user?.isAdmin && (
          <Link to="/admin/events" className="admin-events-button">
              Manage Events
          </Link>
      )}
      <h1 className="events-title">AtlasCore Events Diary</h1>
      <p className="events-subtitle">Stay up-to-date with all the happenings and upcoming events in AtlasCore!</p>
      
      <div className="calendar-navigation">
        <button onClick={handlePrevMonth} className="mc-button small">&#9664; Prev</button>
        <h2>{monthNames[currentMonth]} {currentYear}</h2>
        <button onClick={handleNextMonth} className="mc-button small">Next &#9654;</button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          <div>Sunday</div>
          <div>Monday</div>
          <div>Tuesday</div>
          <div>Wednesday</div>
          <div>Thursday</div>
          <div>Friday</div>
          <div>Saturday</div>
        </div>
        <div className="calendar-days">
          {renderCalendarDays()}
        </div>
      </div>

      {selectedEvent && (
        <div className="event-details-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-details-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal-button" onClick={() => setSelectedEvent(null)}>X</button>
            <h3>{selectedEvent.title}</h3>
            <p className="modal-event-date">{new Date(selectedEvent.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="modal-event-description">{selectedEvent.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
