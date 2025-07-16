const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products, grouped by category
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    const categories = await Category.findAll();
    const categorizedProducts = {};
    categories.forEach(cat => { categorizedProducts[cat.name] = []; });
    products.forEach(p => {
        const category = categories.find(c => c.id === p.category);
        if (category) categorizedProducts[category.name].push(p);
    });
    res.status(200).json({ success: true, products: categorizedProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
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