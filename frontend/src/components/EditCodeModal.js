// frontend/src/components/EditCodeModal.js
import React, { useState, useEffect } from 'react';

const EditCodeModal = ({ code, onClose, onSave }) => {
    // Initialize state, ensuring that any potentially null values are set to empty strings for the inputs.
    const [editedCode, setEditedCode] = useState({
        ...code,
        discountValue: code.discountValue || '',
        maxUses: code.maxUses || '',
        expiryDate: code.expiryDate ? new Date(code.expiryDate).toISOString().split('T')[0] : '', // Format date correctly for input
        in_game_commands: Array.isArray(code.in_game_commands) && code.in_game_commands.length > 0 ? code.in_game_commands : ['']
    });

    useEffect(() => {
        // This effect ensures the modal's state updates if a new code is passed in.
        setEditedCode({
            ...code,
            discountValue: code.discountValue || '',
            maxUses: code.maxUses || '',
            expiryDate: code.expiryDate ? new Date(code.expiryDate).toISOString().split('T')[0] : '',
            in_game_commands: Array.isArray(code.in_game_commands) && code.in_game_commands.length > 0 ? code.in_game_commands : ['']
        });
    }, [code]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedCode(prev => ({ ...prev, [name]: value }));
    };

    const handleCommandChange = (index, value) => {
        const commands = [...editedCode.in_game_commands];
        commands[index] = value;
        setEditedCode(prev => ({ ...prev, in_game_commands: commands }));
    };
    
    const addCommand = () => {
        setEditedCode(prev => ({ ...prev, in_game_commands: [...prev.in_game_commands, ''] }));
    };

    const removeCommand = (index) => {
        const commands = [...editedCode.in_game_commands];
        commands.splice(index, 1);
        setEditedCode(prev => ({ ...prev, in_game_commands: commands }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editedCode);
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-dashboard-container">
                <button onClick={onClose} className="close-modal-button">X</button>
                <h2>Edit Promo Code</h2>
                <form onSubmit={handleSubmit} className="admin-form grid-form">
                    <input type="text" name="code" value={editedCode.code || ''} onChange={handleChange} placeholder="Code" required />
                    
                    <div className="form-group full-width">
                        <label>Code Type</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label><input type="radio" name="codeType" value="discount" checked={editedCode.codeType === 'discount'} onChange={handleChange} /> Discount</label>
                            <label><input type="radio" name="codeType" value="reward" checked={editedCode.codeType === 'reward'} onChange={handleChange} /> Reward</label>
                        </div>
                    </div>

                    {editedCode.codeType === 'discount' && (
                        <>
                            <select name="discountType" value={editedCode.discountType || 'percentage'} onChange={handleChange}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                            </select>
                            <input type="number" name="discountValue" value={editedCode.discountValue} onChange={handleChange} placeholder="Discount Value" required />
                        </>
                    )}
                    
                    {editedCode.codeType === 'reward' && (
                        <div className="full-width">
                            <label>In-Game Commands</label>
                            {editedCode.in_game_commands.map((command, index) => (
                                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        value={command}
                                        onChange={(e) => handleCommandChange(index, e.target.value)}
                                        placeholder={`Command #${index + 1} (e.g., give {player} diamond 5)`}
                                    />
                                    {editedCode.in_game_commands.length > 1 && (
                                        <button type="button" onClick={() => removeCommand(index)} className="mc-button small danger">-</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addCommand} className="mc-button small">+</button>
                        </div>
                    )}
                    
                    <input type="number" name="maxUses" value={editedCode.maxUses} onChange={handleChange} placeholder="Max Uses (optional)" />
                    <input type="date" name="expiryDate" value={editedCode.expiryDate} onChange={handleChange} />
                    
                    <button type="submit" className="mc-button primary full-width">Save Changes</button>
                </form>
            </div>
        </div>
    );
};

export default EditCodeModal;