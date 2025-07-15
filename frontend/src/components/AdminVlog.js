// frontend/src/components/AdminVlog.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import RichTextEditor from './RichTextEditor';
import '../css/AdminWiki.css'; // Re-use styles from AdminWiki

const AdminVlog = ({ user }) => {
    const [posts, setPosts] = useState([]);
    const [editingPost, setEditingPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('token');

    const fetchPosts = useCallback(() => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        setLoading(true);
        axios.get('http://localhost:5000/api/v1/vlog/posts', config)
            .then(res => {
                if(res.data.success) {
                    setPosts(res.data.posts);
                } else {
                    setError('Could not fetch vlog posts.');
                }
            })
            .catch(err => setError(err.response?.data?.message || 'Failed to load posts.'))
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleSelectPost = (post) => {
        setEditingPost({ ...post });
        setSuccess('');
        setError('');
    };
    
    const handleNewPost = () => {
        setEditingPost({ title: '', content: '', author: user?.username || 'Admin' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditingPost(prev => ({ ...prev, [name]: value }));
    };
    
    const handleEditorChange = (e) => {
        const { value } = e.target;
        setEditingPost(prev => ({...prev, content: value}));
    }

    const handleSavePost = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!editingPost.title || !editingPost.content) {
            setError('Title and content are required.');
            return;
        }
        
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            if (editingPost.id) {
                // Update existing post
                await axios.put(`http://localhost:5000/api/v1/vlog/posts/${editingPost.id}`, editingPost, config);
                setSuccess('Post updated successfully.');
            } else {
                // Create new post
                await axios.post('http://localhost:5000/api/v1/vlog/posts', editingPost, config);
                setSuccess('Post created successfully.');
            }
            fetchPosts();
            setEditingPost(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save post.');
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/vlog/posts/${postId}`, config);
                setSuccess('Post deleted successfully.');
                fetchPosts();
                if(editingPost?.id === postId) setEditingPost(null);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete post.');
            }
        }
    };


    if (loading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-wiki-container">
            <h1>Manage Vlog</h1>
            {error && <div className="auth-error-message">{error}</div>}
            {success && <div className="auth-success-message">{success}</div>}

            <div className="admin-wiki-grid">
                <div className="admin-wiki-section">
                    <h2>Vlog Posts</h2>
                    <button onClick={handleNewPost} className="mc-button primary" style={{marginBottom: '1rem'}}>
                        Create New Post
                    </button>
                    <div className="admin-wiki-list">
                        {posts.map(post => (
                            <div key={post.id} className={`admin-wiki-list-item ${editingPost?.id === post.id ? 'selected' : ''}`} onClick={() => handleSelectPost(post)}>
                                <span>{post.title}</span>
                                <div className="admin-wiki-actions">
                                    <button onClick={(e) => {e.stopPropagation(); handleDeletePost(post.id)}} className="mc-button small danger">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-wiki-section">
                    {editingPost ? (
                        <form onSubmit={handleSavePost} className="admin-wiki-form">
                            <h3>{editingPost.id ? 'Editing Post' : 'Creating New Post'}</h3>
                            <input type="text" name="title" value={editingPost.title} onChange={handleInputChange} placeholder="Post Title" required/>
                            <input type="text" name="author" value={editingPost.author} onChange={handleInputChange} placeholder="Author" required/>
                            <RichTextEditor value={editingPost.content} onChange={handleEditorChange} />
                            <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                                <button type="submit" className="mc-button primary">Save Post</button>
                                <button type="button" onClick={() => setEditingPost(null)} className="mc-button">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <h2>Select a post to edit or create a new one.</h2>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminVlog;
