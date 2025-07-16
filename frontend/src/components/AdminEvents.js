// frontend/src/components/AdminEvents.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../css/AdminEvents.css'; // New CSS file for admin events

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: '', // YYYY-MM-DD format for input type="date"
        type: 'event',
    });
    const [editingEvent, setEditingEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('token');

    const fetchEvents = useCallback(async () => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get('http://localhost:5000/api/v1/events', config);
            if (data.success) {
                // Ensure dates are correctly formatted for input fields if editing
                const fetchedEvents = data.events.map(event => ({
                    ...event,
                    date: event.date ? new Date(event.date).toISOString().split('T')[0] : '', // Format for input type="date"
                }));
                setEvents(fetchedEvents);
            } else {
                setError('Could not fetch events.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load events.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEvent(prev => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingEvent(prev => ({ ...prev, [name]: value }));
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const payload = { ...newEvent };
            await axios.post('http://localhost:5000/api/v1/events', payload, config);
            setNewEvent({ title: '', description: '', date: '', type: 'event' });
            setSuccess('Event created successfully!');
            fetchEvents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add event.');
        }
    };

    const handleEditEvent = (event) => {
        setEditingEvent({ ...event });
        setSuccess('');
        setError('');
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.put(`http://localhost:5000/api/v1/events/${editingEvent.id}`, editingEvent, config);
            setSuccess('Event updated successfully!');
            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update event.');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            setError('');
            setSuccess('');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/events/${eventId}`, config);
                setSuccess('Event deleted successfully!');
                setEditingEvent(null);
                fetchEvents();
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete event.');
            }
        }
    };

    if (loading) return <div className="loading-container">Loading Events Management...</div>;

    return (
        <div className="admin-events-container">
            <h1>Manage Events</h1>
            {error && <div className="auth-error-message">{error}</div>}
            {success && <div className="auth-success-message">{success}</div>}
            
            <div className="admin-section">
                <h2>Create New Event</h2>
                <form onSubmit={handleAddEvent} className="admin-form grid-form">
                    <input type="text" name="title" value={newEvent.title} onChange={handleInputChange} placeholder="Event Title" required />
                    <input type="date" name="date" value={newEvent.date} onChange={handleInputChange} required />
                    <select name="type" value={newEvent.type} onChange={handleInputChange}>
                        <option value="event">General Event</option>
                        <option value="major">Major Event</option>
                        <option value="announcement">Announcement</option>
                        <option value="info">Information</option>
                    </select>
                    <textarea name="description" value={newEvent.description} onChange={handleInputChange} placeholder="Event Description" className="full-width" />
                    <button type="submit" className="mc-button primary full-width">Add Event</button>
                </form>
            </div>

            <div className="admin-section">
                <h2>Existing Events</h2>
                <div className="event-management-list">
                    {events.length > 0 ? (
                        events.map(event => (
                            <div key={event.id} className="event-manage-item">
                                <span>{event.title} ({event.date})</span>
                                <div className="event-actions">
                                    <button onClick={() => handleEditEvent(event)} className="mc-button small">Edit</button>
                                    <button onClick={() => handleDeleteEvent(event.id)} className="mc-button small danger">Delete</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No events found. Create one above!</p>
                    )}
                </div>
            </div>

            {editingEvent && (
                <div className="event-details-modal-overlay">
                    <div className="event-details-modal-content">
                        <button className="close-modal-button" onClick={() => setEditingEvent(null)}>X</button>
                        <h2>Edit Event</h2>
                        <form onSubmit={handleUpdateEvent} className="admin-form grid-form">
                            <input type="text" name="title" value={editingEvent.title} onChange={handleEditInputChange} placeholder="Event Title" required />
                            <input type="date" name="date" value={editingEvent.date} onChange={handleEditInputChange} required />
                            <select name="type" value={editingEvent.type} onChange={handleEditInputChange}>
                                <option value="event">General Event</option>
                                <option value="major">Major Event</option>
                                <option value="announcement">Announcement</option>
                                <option value="info">Information</option>
                            </select>
                            <textarea name="description" value={editingEvent.description} onChange={handleEditInputChange} placeholder="Event Description" className="full-width" />
                            <button type="submit" className="mc-button primary full-width">Save Changes</button>
                            <button type="button" onClick={() => setEditingEvent(null)} className="mc-button full-width">Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEvents;
