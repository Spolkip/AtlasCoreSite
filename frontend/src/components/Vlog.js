// frontend/src/components/Vlog.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Vlog.css';

const Vlog = ({ user }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/v1/vlog/posts');
                if (data.success) {
                    setPosts(data.posts);
                } else {
                    setError('Could not fetch vlog posts.');
                }
            } catch (err) {
                setError('An error occurred while fetching the vlog posts.');
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) return <div className="loading-container">Loading Dev Vlog...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="vlog-container">
            {user?.isAdmin && (
                <Link to="/admin/vlog" className="admin-vlog-button">
                    Manage Vlog
                </Link>
            )}
            <h1 className="vlog-main-title">Development Vlog</h1>
            <p className="vlog-subtitle">Stay updated with the latest news and progress from the AtlasCore team!</p>
            <div className="vlog-posts-list">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post.id} className="vlog-post-card">
                            <h2 className="vlog-post-title">{post.title}</h2>
                            <div className="vlog-post-meta">
                                By {post.author} on {new Date(post.createdAt.seconds * 1000).toLocaleDateString()}
                            </div>
                            <div className="vlog-post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
                        </div>
                    ))
                ) : (
                    <p>No announcements have been posted yet. Check back soon!</p>
                )}
            </div>
        </div>
    );
};

export default Vlog;
