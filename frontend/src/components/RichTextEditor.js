import React, { useState, useEffect, useRef } from 'react';
import InputModal from './InputModal';

// Reusable Dropdown Button Component
const DropdownButton = ({ name, children, icon, activeDropdown, setActiveDropdown }) => (
    <div className="dropdown">
        <button
            type="button"
            className="dropdown-toggle"
            title={name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveDropdown(activeDropdown === name ? null : name)}
        >
            {icon || name}
        </button>
        {activeDropdown === name && (
            <div className={`dropdown-menu ${name === 'Size' ? 'dropdown-menu-font-size' : ''}`} onMouseLeave={() => setActiveDropdown(null)}>
                {children}
            </div>
        )}
    </div>
);

// RichTextEditor Component
const RichTextEditor = ({ value, onChange, pages }) => {
    const editorRef = useRef(null);
    const lastSelection = useRef(null);
    const isInternalChange = useRef(false);

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleContentChange = () => {
        if (editorRef.current) {
            isInternalChange.current = true;
            onChange({ target: { name: 'content', value: editorRef.current.innerHTML } });
        }
    };

    const applyFormat = (command, val = null) => {
        editorRef.current.focus();
        document.execCommand(command, false, val);
        handleContentChange();
    };
    
    const handleUrlLink = () => {
        editorRef.current.focus();
        // Check if the selection's parent node is a link
        const parentNode = window.getSelection().anchorNode.parentNode;
        const isLink = parentNode.nodeName === 'A' || document.queryCommandState('unlink');

        if (isLink) {
            applyFormat('unlink');
        } else {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                lastSelection.current = selection.getRangeAt(0).cloneRange();
            }
            setIsLinkModalOpen(true);
        }
    };

    /**
     * Handles the submission from the link URL modal.
     * This is the core fix for linking images.
     */
    const handleLinkSubmit = (url) => {
        if (!url || !lastSelection.current) return;

        editorRef.current.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastSelection.current);
        
        // Check if the stored selection contains an <img> element.
        const selectedFragment = lastSelection.current.cloneContents();
        const selectedImage = selectedFragment.querySelector('img');

        if (selectedImage) {
            // If an image was selected, we manually create the link.
            // This is more reliable than using execCommand for images.
            const link = document.createElement('a');
            link.href = url;
            link.appendChild(selectedImage.cloneNode(true)); // Add a copy of the image inside the link

            const range = sel.getRangeAt(0);
            range.deleteContents(); // Remove the original, unlinked image
            range.insertNode(link); // Insert the new 'a' tag containing the image
            handleContentChange();
        } else {
            // If the selection is just text, use the standard browser command.
            applyFormat('createLink', url);
        }
    };

    const handleImageSubmit = (url) => {
        if (url) {
            applyFormat('insertImage', url);
        }
    };

    // All other handlers remain the same...
    const applyFontColor = (color) => applyFormat('foreColor', color);
    const applyFontSize = (size) => {
        const sizeMap = { '8px': 1, '10px': 2, '14px': 3, '18px': 4, '24px': 5, '32px': 6, '48px': 7 };
        applyFormat('fontSize', sizeMap[size] || 3);
    };
    const handleImageInsert = () => {
        editorRef.current.focus();
        setIsImageModalOpen(true);
    };
    const handleLinkPage = (page) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        let linkText = sel.toString().trim() || page.title;

        if (sel.toString().trim() !== page.title) {
            const textNode = document.createTextNode(linkText);
            range.deleteContents();
            range.insertNode(textNode);
            const newRange = document.createRange();
            newRange.selectNodeContents(textNode);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
        
        applyFormat('createLink', `/wiki/page/${page.id}`);
        setActiveDropdown(null);
    };

    const colorPalette = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FFFFFF', '#C0C0C0', '#808080', '#404040', '#000000', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#8B4513'];
    const fontSizes = [ '8px', '10px', '14px', '18px', '24px', '32px', '48px' ];
    const headings = [ 'h1', 'h2', 'h3' ];
    const alignments = [
        { cmd: 'justifyLeft', display: 'Left' },
        { cmd: 'justifyCenter', display: 'Center' },
        { cmd: 'justifyRight', display: 'Right' },
        { cmd: 'justifyFull', display: 'Full' }
    ];

    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <button type="button" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')}><b>B</b></button>
                <button type="button" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')}><i>I</i></button>
                <button type="button" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')}><u>U</u></button>
                <div className="toolbar-divider"></div>
                <DropdownButton name="Align" icon="Align" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}>
                    {alignments.map(align => (
                        <div key={align.cmd} className="dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { applyFormat(align.cmd); setActiveDropdown(null); }}>{align.display}</div>
                    ))}
                </DropdownButton>
                <div className="toolbar-divider"></div>
                {headings.map(h => <button key={h} type="button" title={h.toUpperCase()} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', `<${h}>`)}>{h.toUpperCase()}</button>)}
                <button type="button" title="Blockquote" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', '<blockquote>')}>"</button>
                <div className="toolbar-divider"></div>
                <DropdownButton name="Size" icon="Size" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}>
                    {fontSizes.map(size => <div key={size} className="dropdown-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { applyFontSize(size); setActiveDropdown(null); }}><span style={{ fontSize: size }}>{size}</span></div>)}
                </DropdownButton>
                <DropdownButton name="Color" icon="Color" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}>
                    <div className="color-palette">{colorPalette.map(color => <div key={color} className="color-swatch" style={{ backgroundColor: color }} onMouseDown={(e) => e.preventDefault()} onClick={() => { applyFontColor(color); setActiveDropdown(null); }} />)}</div>
                </DropdownButton>
                <div className="toolbar-divider"></div>
                <button type="button" title="Image" className="editor-button" onMouseDown={(e) => e.preventDefault()} onClick={handleImageInsert}>Image</button>
                <DropdownButton name="Link Page" icon="Link Page" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}>
                    {pages?.length > 0 ? pages.map(page => <div key={page.id} className="dropdown-item" onMouseDown={(e) => e.preventDefault()} onClick={() => handleLinkPage(page)}>{page.title}</div>) : <div className="dropdown-item disabled">No pages to link.</div>}
                </DropdownButton>
                <button type="button" title="Link URL" className="editor-button" onMouseDown={(e) => e.preventDefault()} onClick={handleUrlLink}>Link URL</button>
            </div>
            <div ref={editorRef} contentEditable="true" className="wysiwyg-editor" onInput={handleContentChange} />
            
            <InputModal title="Insert Link URL" label="URL" placeholder="https://example.com" isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onSubmit={handleLinkSubmit} />
            <InputModal title="Insert Image" label="Image URL" placeholder="https://example.com/image.png" isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} onSubmit={handleImageSubmit} />
        </div>
    );
};

export default RichTextEditor;