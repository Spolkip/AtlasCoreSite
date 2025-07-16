const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products, grouped by category
// MODIFIED: Now accepts filter and sort parameters
exports.getProducts = async (req, res) => {
  try {
    // Extract filter parameters from query
    const { searchTerm, minPrice, maxPrice, inStockOnly, sortBy } = req.query;

    // Build filter object for the model
    const filters = {
      searchTerm,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      inStockOnly: inStockOnly === 'true', // Convert string to boolean
      sortBy,
    };

    // Fetch products using the new filtered method
    const products = await Product.findAllFiltered(filters);
    const categories = await Category.findAll();
    
    // Group products by category name
    const categorizedProducts = {};
    categories.forEach(cat => { categorizedProducts[cat.name] = []; }); // Initialize all categories

    products.forEach(p => {
        const category = categories.find(c => c.id === p.category);
        if (category) {
            // Ensure the category exists in our initialized map before pushing
            if (categorizedProducts[category.name]) {
                categorizedProducts[category.name].push(p);
            }
        }
    });

    res.status(200).json({ success: true, products: categorizedProducts });
  } catch (error) {
    console.error('Error in getProducts (with filters):', error);
    res.status(500).json({ success: false, message: 'Server error fetching products.' });
  }
};

// @desc    Get a single product by ID
exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new product (Admin only)
exports.createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a product (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await product.update(req.body);
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a product (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await Product.delete(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
