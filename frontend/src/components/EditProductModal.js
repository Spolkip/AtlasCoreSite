// frontend/src/components/EditProductModal.js
import React, { useState, useEffect } from 'react';

const EditProductModal = ({ product, categories, onClose, onSave }) => {
    // FIX: Initialize editedProduct.stock to empty string if null for input field
    const [editedProduct, setEditedProduct] = useState({ 
        ...product, 
        in_game_commands: Array.isArray(product.in_game_commands) ? product.in_game_commands : [product.in_game_command || ''],
        stock: product.stock === null ? '' : product.stock, // Set to empty string for input
        discountPrice: product.discountPrice === null || product.discountPrice === undefined ? '' : product.discountPrice
    });

    useEffect(() => {
        // FIX: Update editedProduct.stock to empty string if null when prop changes
        setEditedProduct({ 
            ...product, 
            in_game_commands: Array.isArray(product.in_game_commands) ? product.in_game_commands : [product.in_game_command || ''],
            stock: product.stock === null ? '' : product.stock, // Set to empty string for input
            discountPrice: product.discountPrice === null || product.discountPrice === undefined ? '' : product.discountPrice
        });
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleCommandChange = (index, value) => {
        const commands = [...editedProduct.in_game_commands];
        commands[index] = value;
        setEditedProduct(prev => ({ ...prev, in_game_commands: commands }));
    };

    const addCommand = () => {
        setEditedProduct(prev => ({ ...prev, in_game_commands: [...prev.in_game_commands, ''] }));
    };

    const removeCommand = (index) => {
        const commands = [...editedProduct.in_game_commands];
        commands.splice(index, 1);
        setEditedProduct(prev => ({ ...prev, in_game_commands: commands }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editedProduct); // Pass the raw editedProduct, parent will handle null for stock
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-dashboard-container">
                <button onClick={onClose} className="close-modal-button">X</button>
                <h2>Edit Product</h2>
                <form onSubmit={handleSubmit} className="admin-form grid-form">
                    <input type="text" name="name" value={editedProduct.name || ''} onChange={handleChange} placeholder="Product Name" required />
                    <input type="number" step="0.01" name="price" value={editedProduct.price || ''} onChange={handleChange} placeholder="Price" required />
                    <input type="number" step="0.01" name="discountPrice" value={editedProduct.discountPrice} onChange={handleChange} placeholder="Discount Price (Optional)" />
                    {/* FIX: Updated placeholder for infinite stock */}
                    <input type="number" name="stock" value={editedProduct.stock} onChange={handleChange} placeholder="Stock (Optional: leave empty for infinite)" />
                    <select name="category" value={editedProduct.category || ''} onChange={handleChange} required>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <textarea name="description" value={editedProduct.description || ''} onChange={handleChange} placeholder="Product Description" className="full-width" />
                    <input type="text" name="imageUrl" value={editedProduct.imageUrl || ''} onChange={handleChange} placeholder="Image URL" className="full-width" />
                    
                    <div className="full-width">
                        {editedProduct.in_game_commands.map((command, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    value={command}
                                    onChange={(e) => handleCommandChange(index, e.target.value)}
                                    placeholder={`In-Game Command #${index + 1}`}
                                />
                                {editedProduct.in_game_commands.length > 1 && (
                                    <button type="button" onClick={() => removeCommand(index)} className="mc-button small danger">-</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addCommand} className="mc-button small">+</button>
                    </div>

                    <button type="submit" className="mc-button primary full-width">Save Changes</button>
                </form>
            </div>
        </div>
    );
};

export default EditProductModal;