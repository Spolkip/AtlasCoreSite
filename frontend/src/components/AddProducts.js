// frontend/src/components/AddProducts.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/AddProducts.css';
import EditProductModal from './EditProductModal';
import EditCategoryModal from './EditCategoryModal';

const AddProducts = () => {
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '',
        stock: '', // Keep as empty string for input field
        category: '',
        imageUrl: '',
        in_game_commands: ['']
    });

    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
    });

    const [editingProduct, setEditingProduct] = useState(null);
    const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);


    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsResponse, categoriesResponse] = await Promise.all([
                    axios.get('http://localhost:5000/api/v1/products', config),
                    axios.get('http://localhost:5000/api/v1/admin/categories', config)
                ]);

                if (productsResponse.data.success) {
                    const allProducts = Object.values(productsResponse.data.products).flat();
                    setProducts(allProducts);
                }
                if (categoriesResponse.data.success) {
                    setCategories(categoriesResponse.data.categories);
                    if (categoriesResponse.data.categories.length > 0) {
                        setNewProduct(p => ({ ...p, category: categoriesResponse.data.categories[0].id }));
                    }
                }
            } catch (err) {
                setError('Failed to load data. Please ensure you are logged in as an admin.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleInputChange = (setter) => (e) => {
        const { name, value } = e.target;
        setter(prev => ({ ...prev, [name]: value }));
    };

    const handleCommandChange = (index, value) => {
        const commands = [...newProduct.in_game_commands];
        commands[index] = value;
        setNewProduct(prev => ({ ...prev, in_game_commands: commands }));
    };

    const addCommand = () => {
        setNewProduct(prev => ({ ...prev, in_game_commands: [...prev.in_game_commands, ''] }));
    };

    const removeCommand = (index) => {
        const commands = [...newProduct.in_game_commands];
        commands.splice(index, 1);
        setNewProduct(prev => ({ ...prev, in_game_commands: commands }));
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            // FIX: Send stock as null if empty string for infinite stock
            const productToSend = { 
                ...newProduct, 
                stock: newProduct.stock === '' ? null : Number(newProduct.stock) 
            };
            const { data } = await axios.post('http://localhost:5000/api/v1/admin/products', productToSend, config);
            if (data.success) {
                setProducts(prev => [...prev, data.product]);
                // Reset form
                setNewProduct({ name: '', description: '', price: '', stock: '', category: categories.length > 0 ? categories[0].id : '', imageUrl: '', in_game_commands: [''] });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add product.');
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await axios.delete(`http://localhost:5000/api/v1/admin/products/${productId}`, config);
                setProducts(products.filter(p => p.id !== productId));
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete product.');
            }
        }
    };

    const handleEditProduct = (product) => {
        // FIX: Pass stock as empty string if null for input field to display correctly
        setEditingProduct({ ...product, stock: product.stock === null ? '' : product.stock });
        setIsEditProductModalOpen(true);
    };

    const handleUpdateProduct = async (updatedProduct) => {
        try {
            // FIX: Send stock as null if empty string for infinite stock
            const productToSend = { 
                ...updatedProduct, 
                stock: updatedProduct.stock === '' ? null : Number(updatedProduct.stock) 
            };
            await axios.put(`http://localhost:5000/api/v1/admin/products/${updatedProduct.id}`, productToSend, config);
            setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            setIsEditProductModalOpen(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update product.');
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/admin/categories', newCategory, config);
            if (data.success) {
                setCategories(prev => [...prev, data.category]);
                setNewCategory({ name: '', description: '' });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add category.');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await axios.delete(`http://localhost:5000/api/v1/admin/categories/${categoryId}`, config);
                setCategories(categories.filter(c => c.id !== categoryId));
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete category.');
            }
        }
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setIsEditCategoryModalOpen(true);
    };

    const handleUpdateCategory = async (updatedCategory) => {
        try {
            await axios.put(`http://localhost:5000/api/v1/admin/categories/${updatedCategory.id}`, updatedCategory, config);
            setCategories(categories.map(c => c.id === updatedCategory.id ? updatedCategory : c));
            setIsEditCategoryModalOpen(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update category.');
        }
    };

    if (loading) return <div className="loading-container">Loading Admin Panel...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="admin-dashboard-container">
            <h1>Add Products and Categories</h1>

            {/* Category Management ... (no changes needed here) ... */}
            <div className="admin-section">
                <h2>Manage Categories</h2>
                <form onSubmit={handleAddCategory} className="admin-form">
                    <input type="text" name="name" value={newCategory.name} onChange={handleInputChange(setNewCategory)} placeholder="Category Name" required />
                    <input type="text" name="description" value={newCategory.description} onChange={handleInputChange(setNewCategory)} placeholder="Category Description" />
                    <button type="submit" className="mc-button primary">Add Category</button>
                </form>
                <div className="category-management-list">
                    {categories.map(cat => (
                        <div key={cat.id} className="category-manage-item">
                            <span>{cat.name}</span>
                            <div className="product-actions">
                                <button onClick={() => handleEditCategory(cat)} className="mc-button small">Edit</button>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="mc-button small danger">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Product Management */}
            <div className="admin-section">
                <h2>Manage Products</h2>
                <form onSubmit={handleAddProduct} className="admin-form grid-form">
                    <input type="text" name="name" value={newProduct.name} onChange={handleInputChange(setNewProduct)} placeholder="Product Name" required />
                    <input type="number" step="0.01" name="price" value={newProduct.price} onChange={handleInputChange(setNewProduct)} placeholder="Price" required />
                    <input type="number" name="stock" value={newProduct.stock} onChange={handleInputChange(setNewProduct)} placeholder="Stock (Optional: leave empty for infinite)" />
                    <select name="category" value={newProduct.category} onChange={handleInputChange(setNewProduct)} required>
                        <option value="" disabled>Select Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <textarea name="description" value={newProduct.description} onChange={handleInputChange(setNewProduct)} placeholder="Product Description" className="full-width" />
                    <input type="text" name="imageUrl" value={newProduct.imageUrl} onChange={handleInputChange(setNewProduct)} placeholder="Image URL" className="full-width" />
                    
                    <div className="full-width">
                        {newProduct.in_game_commands.map((command, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    value={command}
                                    onChange={(e) => handleCommandChange(index, e.target.value)}
                                    placeholder={`In-Game Command #${index + 1}`}
                                />
                                {newProduct.in_game_commands.length > 1 && (
                                    <button type="button" onClick={() => removeCommand(index)} className="mc-button small danger">-</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addCommand} className="mc-button small">+</button>
                    </div>

                    <button type="submit" className="mc-button primary full-width">Add Product</button>
                </form>
                <div className="product-management-list">
                    {products.map(prod => (
                        <div key={prod.id} className="product-manage-item">
                            <span>{prod.name}</span>
                            <div className="product-actions">
                                <button onClick={() => handleEditProduct(prod)} className="mc-button small">Edit</button>
                                <button onClick={() => handleDeleteProduct(prod.id)} className="mc-button small danger">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isEditProductModalOpen && (
                <EditProductModal
                    product={editingProduct}
                    categories={categories}
                    onClose={() => setIsEditProductModalOpen(false)}
                    onSave={handleUpdateProduct}
                />
            )}
            {isEditCategoryModalOpen && (
                <EditCategoryModal
                    category={editingCategory}
                    onClose={() => setIsEditCategoryModalOpen(false)}
                    onSave={handleUpdateCategory}
                />
            )}
        </div>
    );
};

export default AddProducts;
