import React, { useState, useEffect } from 'react';

const EditCategoryModal = ({ category, onClose, onSave }) => {
    const [editedCategory, setEditedCategory] = useState(category);

    useEffect(() => {
        setEditedCategory(category);
    }, [category]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedCategory(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editedCategory);
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-dashboard-container">
                <button onClick={onClose} className="close-modal-button">X</button>
                <h2>Edit Category</h2>
                <form onSubmit={handleSubmit} className="admin-form">
                    <input type="text" name="name" value={editedCategory.name} onChange={handleChange} placeholder="Category Name" required />
                    <input type="text" name="description" value={editedCategory.description} onChange={handleChange} placeholder="Category Description" />
                    <button type="submit" className="mc-button primary">Save Changes</button>
                </form>
            </div>
        </div>
    );
};

export default EditCategoryModal;