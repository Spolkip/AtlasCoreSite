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