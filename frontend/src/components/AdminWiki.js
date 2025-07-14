import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../css/AdminWiki.css';
import RichTextEditor from './RichTextEditor';

const AdminWiki = () => {
    const [categories, setCategories] = useState([]);
    const [allPages, setAllPages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingPage, setEditingPage] = useState(null);
    const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });
    const [activeTab, setActiveTab] = useState('content');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(() => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        setLoading(true);
        setError('');
        setSuccess('');

        Promise.all([
            axios.get('http://localhost:5000/api/v1/wiki/categories', config),
            axios.get('http://localhost:5000/api/v1/wiki/pages/by-category/all', config)
        ]).then(([catResponse, pageResponse]) => {
            if (catResponse.data.success) {
                const flattenCategories = (cats, level = 0) => {
                    let flat = [];
                    cats.forEach(cat => {
                        flat.push({ ...cat, displayName: `${'--'.repeat(level)} ${cat.name}` });
                        if (cat.children && cat.children.length > 0) {
                            flat = flat.concat(flattenCategories(cat.children, level + 1));
                        }
                    });
                    return flat;
                }
                setCategories(flattenCategories(catResponse.data.categories));
            }
            if (pageResponse.data.success) {
                setAllPages(pageResponse.data.pages);
            }
        }).catch(err => {
            setError(err.response?.data?.message || 'Failed to load wiki data.');
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectCategory = (category) => {
        setSuccess('');
        setError('');
        setSelectedCategory(category);
        setEditingCategory({ ...category });
        setEditingPage(null);
        setActiveTab('content');
    };

    const handleSelectPageForEditing = (page) => {
        setEditingPage(page);
    };

    const handleInputChange = (setter, field) => (e) => {
        setter(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleEditorChange = (e, editorType) => {
        const { value } = e.target;
        if (editorType === 'category') {
            setEditingCategory(prev => ({ ...prev, content: value }));
        } else if (editorType === 'page') {
            setEditingPage(prev => ({ ...prev, content: value }));
        }
    };
    
    const handleAddCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post('http://localhost:5000/api/v1/wiki/categories', { ...newCategory, content: '' }, config);
            fetchData();
            setNewCategory({ name: '', description: '', parentId: '' });
            setSuccess('Category added successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add category.');
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.put(`http://localhost:5000/api/v1/wiki/categories/${editingCategory.id}`, editingCategory, config);
            fetchData();
            setSuccess('Category content saved successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save category.');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Are you sure? Deleting a category will also delete its pages.')) {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/wiki/categories/${categoryId}`, config);
                fetchData();
                setSelectedCategory(null);
                setEditingCategory(null);
                setSuccess('Category deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete category.');
            }
        }
    };

    const handleSavePage = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const pageToSave = {
            title: editingPage.title,
            content: editingPage.content,
            categoryId: 'uncategorized'
        };

        try {
            if (editingPage.id) {
                await axios.put(`http://localhost:5000/api/v1/wiki/pages/${editingPage.id}`, pageToSave, config);
                setSuccess('Page updated successfully.');
            } else {
                await axios.post('http://localhost:5000/api/v1/wiki/pages', pageToSave, config);
                setSuccess('Page created successfully.');
            }
            fetchData();
            setEditingPage(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save page.');
        }
    };

    const handleDeletePage = async (pageId) => {
        if (window.confirm('Are you sure you want to delete this page?')) {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/wiki/pages/${pageId}`, config);
                fetchData();
                if(editingPage?.id === pageId) setEditingPage(null);
                setSuccess('Page deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete page.');
            }
        }
    };

    if (loading) return <div className="loading-container">Loading Wiki Management...</div>;

    return (
        <div className="admin-wiki-container">
            <h1>Manage Wiki</h1>
            {error && <div className="auth-error-message">{error}</div>}
            {success && <div className="auth-success-message">{success}</div>}

            <div className="admin-wiki-grid">
                <div className="admin-wiki-section">
                    <h2>Categories</h2>
                    <form onSubmit={handleAddCategory} className="admin-wiki-form">
                        <input type="text" name="name" value={newCategory.name} onChange={handleInputChange(setNewCategory, 'name')} placeholder="New Category Name" required />
                        <select name="parentId" value={newCategory.parentId} onChange={handleInputChange(setNewCategory, 'parentId')}>
                            <option value="">None (Top Level)</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.displayName}</option>)}
                        </select>
                        <button type="submit" className="mc-button primary">Add Category</button>
                    </form>
                    <div className="admin-wiki-list">
                        {categories.map(cat => (
                            <div key={cat.id} className={`admin-wiki-list-item ${selectedCategory?.id === cat.id ? 'selected' : ''}`} onClick={() => handleSelectCategory(cat)}>
                                <span>{cat.displayName}</span>
                                <div className="admin-wiki-actions">
                                    <button onClick={(e) => {e.stopPropagation(); handleDeleteCategory(cat.id)}} className="mc-button small danger">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-wiki-section">
                    {selectedCategory ? (
                        <>
                            <div className="editor-tabs">
                                <button className={`tab-button ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>Edit Category</button>
                                <button className={`tab-button ${activeTab === 'pages' ? 'active' : ''}`} onClick={() => setActiveTab('pages')}>Manage Pages</button>
                            </div>

                            {activeTab === 'content' && editingCategory && (
                                <form onSubmit={handleSaveCategory} className="admin-wiki-form">
                                    <h3>Editing: {editingCategory.name}</h3>
                                    <input type="text" value={editingCategory.name} onChange={handleInputChange(setEditingCategory, 'name')} placeholder="Category Name" />
                                    <input type="text" value={editingCategory.description || ''} onChange={handleInputChange(setEditingCategory, 'description')} placeholder="Category Description" />
                                    
                                    {/* Parent Category Dropdown */}
                                    <div className="form-group">
                                        <label htmlFor="parentCategory">Parent Category</label>
                                        <select 
                                            id="parentCategory"
                                            name="parentId" 
                                            value={editingCategory.parentId || ''} 
                                            onChange={handleInputChange(setEditingCategory, 'parentId')}
                                        >
                                            <option value="">None (Top Level)</option>
                                            {categories.filter(c => c.id !== editingCategory.id).map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.displayName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <RichTextEditor value={editingCategory.content || ''} onChange={(e) => handleEditorChange(e, 'category')} pages={allPages} />
                                    <button type="submit" className="mc-button primary">Save Category Content</button>
                                </form>
                            )}

                            {activeTab === 'pages' && (
                                <div>
                                    <h3>Manage Linkable Pages</h3>
                                    {editingPage ? (
                                        <form onSubmit={handleSavePage} className="admin-wiki-form">
                                            <h4>{editingPage.id ? 'Editing Page' : 'Creating New Page'}</h4>
                                            <input type="text" value={editingPage.title} onChange={handleInputChange(setEditingPage, 'title')} placeholder="Page Title" required />
                                            <RichTextEditor value={editingPage.content || ''} onChange={(e) => handleEditorChange(e, 'page')} pages={allPages} />
                                            <div className="admin-wiki-actions">
                                                <button type="submit" className="mc-button primary">Save Page</button>
                                                <button type="button" onClick={() => setEditingPage(null)} className="mc-button danger">Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button onClick={() => setEditingPage({ title: '', content: '' })} className="mc-button primary" style={{marginBottom: '1rem'}}>Create New Page</button>
                                    )}
                                    <div className="admin-wiki-list">
                                        {allPages.map(page => (
                                            <div key={page.id} className="admin-wiki-list-item">
                                                <span>{page.title}</span>
                                                <div className="admin-wiki-actions">
                                                    <button onClick={() => handleSelectPageForEditing(page)} className="mc-button small">Edit</button>
                                                    <button onClick={() => handleDeletePage(page.id)} className="mc-button small danger">Del</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <h2>Select a category to begin editing.</h2>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminWiki;