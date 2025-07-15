// frontend/src/components/AdminPromoCodes.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../css/AddProducts.css'; // Reusing styles
import EditCodeModal from './EditCodeModal';

const AdminPromoCodes = () => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [newPromoCode, setNewPromoCode] = useState({
        code: '',
        codeType: 'discount', // 'discount' or 'reward'
        discountType: 'percentage',
        discountValue: '',
        maxUses: '',
        expiryDate: '',
        in_game_commands: ['']
    });
    const [editingCode, setEditingCode] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('token');
    
    const fetchPromoCodes = useCallback(async () => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const { data } = await axios.get('http://localhost:5000/api/v1/promocodes', config);
            if (data.success) {
                setPromoCodes(data.codes);
            }
        } catch (err) {
            setError('Failed to load promo codes.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPromoCodes();
    }, [fetchPromoCodes]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPromoCode(prev => ({ ...prev, [name]: value }));
    };

    const handleCommandChange = (index, value) => {
        const commands = [...newPromoCode.in_game_commands];
        commands[index] = value;
        setNewPromoCode(prev => ({ ...prev, in_game_commands: commands }));
    };

    const addCommand = () => {
        setNewPromoCode(prev => ({ ...prev, in_game_commands: [...prev.in_game_commands, ''] }));
    };
    
    const removeCommand = (index) => {
        if (newPromoCode.in_game_commands.length <= 1) return;
        const commands = [...newPromoCode.in_game_commands];
        commands.splice(index, 1);
        setNewPromoCode(prev => ({ ...prev, in_game_commands: commands }));
    };

    const handleAddPromoCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const payload = { ...newPromoCode };
            if (payload.codeType === 'reward') {
                payload.discountType = null;
                payload.discountValue = 0;
            } else {
                payload.in_game_commands = [];
            }

            const { data } = await axios.post('http://localhost:5000/api/v1/promocodes', payload, config);
            if (data.success) {
                setNewPromoCode({ code: '', codeType: 'discount', discountType: 'percentage', discountValue: '', maxUses: '', expiryDate: '', in_game_commands: [''] });
                setSuccess('Code created successfully!');
                fetchPromoCodes(); // Refresh the list from the server
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add promo code.');
        }
    };

    const handleEditCode = (code) => {
        setEditingCode(code);
        setIsEditModalOpen(true);
    };

    const handleUpdateCode = async (updatedCode) => {
        setError('');
        setSuccess('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const { data } = await axios.put(`http://localhost:5000/api/v1/promocodes/${updatedCode.id}`, updatedCode, config);
            if (data.success) {
                setSuccess('Code updated successfully!');
                setIsEditModalOpen(false);
                fetchPromoCodes(); // Refresh the list from the server
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update promo code.');
        }
    };

    const handleDeletePromoCode = async (codeId) => {
        if (window.confirm('Are you sure you want to delete this promo code?')) {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/promocodes/${codeId}`, config);
                setPromoCodes(promoCodes.filter(c => c.id !== codeId));
                setSuccess('Code deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete promo code.');
            }
        }
    };

    if (loading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-dashboard-container">
            <h1>Manage Codes</h1>
            {error && <div className="auth-error-message">{error}</div>}
            {success && <div className="auth-success-message">{success}</div>}
            
            <div className="admin-section">
                <h2>Create New Code</h2>
                <form onSubmit={handleAddPromoCode} className="admin-form grid-form">
                    <input type="text" name="code" value={newPromoCode.code} onChange={handleInputChange} placeholder="Code (e.g., SUMMER20)" required />
                    
                    <div className="form-group full-width">
                        <label>Code Type</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label><input type="radio" name="codeType" value="discount" checked={newPromoCode.codeType === 'discount'} onChange={handleInputChange} /> Discount</label>
                            <label><input type="radio" name="codeType" value="reward" checked={newPromoCode.codeType === 'reward'} onChange={handleInputChange} /> Reward</label>
                        </div>
                    </div>

                    {newPromoCode.codeType === 'discount' && (
                        <>
                            <select name="discountType" value={newPromoCode.discountType} onChange={handleInputChange}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                            </select>
                            <input type="number" name="discountValue" value={newPromoCode.discountValue} onChange={handleInputChange} placeholder="Discount Value" required />
                        </>
                    )}
                    
                    {newPromoCode.codeType === 'reward' && (
                        <div className="full-width">
                            <label>In-Game Commands</label>
                            {newPromoCode.in_game_commands.map((command, index) => (
                                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        value={command}
                                        onChange={(e) => handleCommandChange(index, e.target.value)}
                                        placeholder={`Command #${index + 1} (e.g., give {player} diamond 5)`}
                                    />
                                    {newPromoCode.in_game_commands.length > 1 && (
                                        <button type="button" onClick={() => removeCommand(index)} className="mc-button small danger">-</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addCommand} className="mc-button small">+</button>
                        </div>
                    )}
                    
                    <input type="number" name="maxUses" value={newPromoCode.maxUses} onChange={handleInputChange} placeholder="Max Uses (optional)" />
                    <input type="date" name="expiryDate" value={newPromoCode.expiryDate} onChange={handleInputChange} />
                    
                    <button type="submit" className="mc-button primary full-width">Create Code</button>
                </form>
            </div>

            <div className="admin-section">
                <h2>Existing Codes</h2>
                <div className="product-management-list">
                    {promoCodes.map(code => (
                        <div key={code.id} className="product-manage-item">
                            <span>{code.code} ({code.codeType})</span>
                            <div className="product-actions">
                                <button onClick={() => handleEditCode(code)} className="mc-button small">Edit</button>
                                <button onClick={() => handleDeletePromoCode(code.id)} className="mc-button small danger">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isEditModalOpen && (
                <EditCodeModal
                    code={editingCode}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleUpdateCode}
                />
            )}
        </div>
    );
};

export default AdminPromoCodes;