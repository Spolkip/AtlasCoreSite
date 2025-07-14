import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/Wiki.css';

// Component for rendering a single category and its children in the sidebar.
const CategoryListItem = ({ category, onSelectCategory, activeCategoryId, expandedCategories, onToggleExpand, level = 0 }) => {
    const isExpanded = !!expandedCategories[category.id];
    const hasChildren = category.children && category.children.length > 0;
    const navigate = useNavigate();

    const handleSelect = () => {
        onSelectCategory(category);
        navigate(`/wiki/category/${category.id}`);
    };

    return (
        <li className="wiki-category-item">
            <div className="category-button-container">
                {hasChildren && (
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleExpand(category.id); }}>
                        ▶
                    </span>
                )}
                <button 
                    onClick={handleSelect}
                    className={activeCategoryId === category.id ? 'active' : ''}
                    style={{ paddingLeft: hasChildren ? '0.5rem' : `${1 + level * 1.5}rem`}}
                >
                    {category.name}
                </button>
            </div>
            {hasChildren && (
                <ul className={`wiki-subcategory-list ${isExpanded ? 'expanded' : ''}`}>
                    {category.children.map(child => (
                        <CategoryListItem 
                            key={child.id} 
                            category={child} 
                            onSelectCategory={onSelectCategory}
                            activeCategoryId={activeCategoryId}
                            expandedCategories={expandedCategories}
                            onToggleExpand={onToggleExpand}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

// Main Wiki component
const Wiki = ({ user }) => {
    const [categories, setCategories] = useState([]);
    const [activeContent, setActiveContent] = useState(null);
    const [contentType, setContentType] = useState('category'); // 'category' or 'page'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});
    const [categorySearch, setCategorySearch] = useState('');
    const [isSearchVisible, setSearchVisible] = useState(false);
    const { type, id } = useParams();

    const fetchCategories = useCallback(async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/v1/wiki/categories');
            if (data.success) {
                setCategories(data.categories);
                return data.categories;
            }
        } catch (err) {
            setError('Failed to load wiki categories.');
        }
        return [];
    }, []);

    const fetchCategoryContent = useCallback(async (categoryId) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`http://localhost:5000/api/v1/wiki/categories/${categoryId}`);
            if (data.success) {
                setActiveContent(data.category);
                setContentType('category');
            } else {
                setError('Category not found.');
            }
        } catch (err) {
            setError('Failed to load category content.');
        } finally {
            setLoading(false);
        }
    }, []);
    
    const fetchPageContent = useCallback(async (pageId) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`http://localhost:5000/api/v1/wiki/pages/${pageId}`);
            if (data.success) {
                setActiveContent(data.page);
                setContentType('page');
            } else {
                setError('Page not found.');
            }
        } catch (err) {
            setError('Failed to load page content.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initializeWiki = async () => {
            setLoading(true);
            const allCategories = await fetchCategories();

            if (type && id) {
                if (type === 'category') {
                    await fetchCategoryContent(id);
                } else if (type === 'page') {
                    await fetchPageContent(id);
                }
            } else if (allCategories.length > 0) {
                // Default to the first category if no specific content is requested
                const firstCategory = allCategories[0];
                await fetchCategoryContent(firstCategory.id);
            }
            setLoading(false);
        };

        initializeWiki();
    }, [type, id, fetchCategories, fetchCategoryContent, fetchPageContent]);

    const handleToggleExpand = useCallback((categoryId) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    }, []);

    const handleCategorySelect = (category) => {
        fetchCategoryContent(category.id);
    };

    const filteredCategories = useMemo(() => {
        if (!categorySearch) return categories;

        const filter = (items) => {
            return items.reduce((acc, item) => {
                const children = item.children ? filter(item.children) : [];
                if (item.name.toLowerCase().includes(categorySearch.toLowerCase()) || children.length > 0) {
                    acc.push({ ...item, children });
                }
                return acc;
            }, []);
        };

        return filter(categories);
    }, [categories, categorySearch]);

    const renderContent = () => {
        if (loading) {
            return <div className="loading-container">Loading Content...</div>;
        }
        if (error) {
            return <div className="error-container">{error}</div>;
        }
        if (!activeContent) {
            return <h2>Select a category to view its content.</h2>;
        }
        
        return (
            <div className="wiki-page-content">
                <h1>{activeContent.name || activeContent.title}</h1>
                {contentType === 'category' && activeContent.description && (
                    <p className="wiki-category-description">{activeContent.description}</p>
                )}
                <div dangerouslySetInnerHTML={{ __html: activeContent.content }} />
            </div>
        );
    };

    return (
        <div className="wiki-container">
            <aside className="wiki-sidebar">
                <div className="wiki-sidebar-header">
                    <h2>Categories</h2>
                    <button type="button" className="search-icon-btn" onClick={() => setSearchVisible(!isSearchVisible)}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                </div>
                 <input
                    type="text"
                    placeholder="Search categories..."
                    className={`wiki-search-input ${isSearchVisible ? 'visible' : ''}`}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                />
                <ul className="wiki-category-list">
                    {filteredCategories.map(cat => (
                        <CategoryListItem 
                            key={cat.id} 
                            category={cat} 
                            onSelectCategory={handleCategorySelect}
                            activeCategoryId={contentType === 'category' ? activeContent?.id : null}
                            expandedCategories={expandedCategories}
                            onToggleExpand={handleToggleExpand}
                        />
                    ))}
                </ul>
            </aside>
            <main className="wiki-main-content">
                {user?.isAdmin && (
                    <Link to="/admin/wiki" className="admin-wiki-button">
                        Manage Wiki
                    </Link>
                )}
                {renderContent()}
            </main>
        </div>
    );
};

export default Wiki;

