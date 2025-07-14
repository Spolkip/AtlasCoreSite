import React, { useState } from 'react';

const InputModal = ({ title, label, placeholder, isOpen, onClose, onSubmit }) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    // This function now handles both the submission logic and closing the modal.
    const handleSubmit = () => {
        if (inputValue.trim()) {
            onSubmit(inputValue);
            setInputValue('');
            onClose();
        }
    };

    // This function allows pressing "Enter" to submit the modal.
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents any default form submission behavior
            handleSubmit();
        }
    };

    return (
        <div className="admin-modal-overlay">
            {/* The form tag has been removed to prevent nesting errors. */}
            <div className="admin-dashboard-container">
                <button onClick={onClose} className="close-modal-button">X</button>
                <h2>{title}</h2>
                <div className="admin-form">
                    <div className="form-group">
                        <label htmlFor="modal-input">{label}</label>
                        <input
                            id="modal-input"
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress} // Added keypress handler
                            placeholder={placeholder}
                            className="auth-input"
                            autoFocus // Automatically focus the input when the modal opens
                        />
                    </div>
                    {/* The button is now type="button" and uses its own click handler. */}
                    <button type="button" onClick={handleSubmit} className="mc-button primary full-width">
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputModal;