const express_products = require('express');
const router = express_products.Router();
const { getProducts, getSingleProduct } = require('../controllers/productController');

// @route   GET /api/v1/products
// @desc    Get all products, grouped by category. This now correctly handles the request.
router.get('/', getProducts);

// @route   GET /api/v1/products/:id
// @desc    Get a single product by its ID.
router.get('/:id', getSingleProduct);

module.exports = router;