const WikiCategory = require('../models/WikiCategory');
const WikiPage = require('../models/WikiPage');

// Helper function to build a nested category tree from a flat array
const buildCategoryTree = (categories) => {
    const map = {};
    const roots = [];

    categories.forEach(category => {
        map[category.id] = { ...category, children: [] };
    });

    categories.forEach(category => {
        if (category.parentId && map[category.parentId]) {
            map[category.parentId].children.push(map[category.id]);
        } else {
            roots.push(map[category.id]);
        }
    });

    return roots;
};

// Get all categories and structure them as a tree
exports.getWikiCategories = async (req, res) => {
  try {
    const categories = await WikiCategory.findAll();
    const categoryTree = buildCategoryTree(categories);
    res.status(200).json({ success: true, categories: categoryTree });
  } catch (error) {
    console.error("Error in getWikiCategories:", error);
    res.status(500).json({ success: false, message: 'Server error fetching wiki categories.' });
  }
};

// Get a single category by its ID
exports.getWikiCategory = async (req, res) => {
    try {
        const category = await WikiCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, category });
    } catch (error) {
        console.error(`Error fetching category ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error fetching category.' });
    }
};

// Get pages, with a special case to fetch all pages for the admin panel
exports.getWikiPagesByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    let pages;
    if (categoryId === 'all') {
        pages = await WikiPage.findAll();
    } else {
        pages = await WikiPage.findByCategoryId(categoryId);
    }
    res.status(200).json({ success: true, pages });
  } catch (error) {
    console.error(`Error in getWikiPagesByCategory for category ${req.params.categoryId}:`, error);
    res.status(500).json({ success: false, message: 'Server error fetching wiki pages.' });
  }
};

// Get a single page by its ID
exports.getWikiPage = async (req, res) => {
    try {
      const page = await WikiPage.findById(req.params.pageId);
      if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
      res.status(200).json({ success: true, page });
    } catch (error) {
      console.error(`Error in getWikiPage for page ${req.params.pageId}:`, error);
      res.status(500).json({ success: false, message: 'Server error fetching wiki page.' });
    }
  };

// Create a new category
exports.createWikiCategory = async (req, res) => {
    try {
        const newCategory = new WikiCategory(req.body);
        await newCategory.save();
        res.status(201).json({ success: true, category: newCategory });
    } catch (error) {
        console.error("Error in createWikiCategory:", error);
        res.status(500).json({ success: false, message: 'Server error creating category' });
    }
};

// Create a new page
exports.createWikiPage = async (req, res) => {
    try {
        const newPage = new WikiPage(req.body);
        await newPage.save();
        res.status(201).json({ success: true, page: newPage });
    } catch (error) {
        console.error("Error in createWikiPage:", error);
        res.status(500).json({ success: false, message: 'Server error creating page' });
    }
};

// Update a category, including its content and parent
// spolkip/atlascoreweb/AtlasCoreWeb-30557ddf6c9e1cf7a4f29449af5efb8e540a5825/backend/controllers/wikiController.js

exports.updateWikiCategory = async (req, res) => {
    try {
        const category = await WikiCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        
        // This part already handles the parentId
        const { name, description, content, parentId } = req.body;
        
        category.name = name;
        category.description = description;
        category.content = content;
        // Setting parentId to null if an empty string is received for top-level categories
        category.parentId = parentId || null;
        
        await category.save();

        res.status(200).json({ success: true, category });
    } catch (error) {
        console.error(`Error in updateWikiCategory for category ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error updating category' });
    }
};

// Delete a category and all associated pages
exports.deleteWikiCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const pagesToDelete = await WikiPage.findByCategoryId(categoryId);
        
        const deletePromises = pagesToDelete.map(page => WikiPage.delete(page.id));
        await Promise.all(deletePromises);

        await WikiCategory.delete(categoryId);

        res.status(200).json({ success: true, message: 'Category and its pages deleted' });
    } catch (error) {
        console.error(`Error in deleteWikiCategory for category ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error deleting category' });
    }
};

// Update a page
exports.updateWikiPage = async (req, res) => {
    try {
        const page = await WikiPage.findById(req.params.id);
        if (!page) {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }
        
        // FIX: Destructure all editable fields to ensure categoryId is updated
        const { title, content, categoryId } = req.body;
        page.title = title;
        page.content = content;
        page.categoryId = categoryId; // Ensure the page's category can be updated

        await page.save();

        res.status(200).json({ success: true, page });
    } catch (error) {
        console.error(`Error in updateWikiPage for page ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error updating page' });
    }
};

// Delete a page
exports.deleteWikiPage = async (req, res) => {
    try {
        await WikiPage.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Page deleted' });
    } catch (error) {
        console.error(`Error in deleteWikiPage for page ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error deleting page' });
    }
};
