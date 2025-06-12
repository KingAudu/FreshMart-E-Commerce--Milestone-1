const express = require('express');
const Cart = require('./cartModel');
const Product = require('./productModel');
const { protect } = require('./authController');

const router = express.Router();

// Get user's cart
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name price images');
    
    if (!cart) {
      const newCart = await Cart.create({ user: req.user.id });
      return res.status(200).json({
        success: true,
        data: { cart: newCart }
      });
    }

    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add item to cart
router.post('/', [
  protect,
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { productId, quantity } = req.body;

    // Verify product exists and is active
    const product = await Product.findOne({ 
      _id: productId, 
      isActive: true 
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable'
      });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} available`
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id });
    }

    // Add item to cart
    await cart.addItem(productId, quantity, product.price);

    // Return updated cart
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images');

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: { cart: updatedCart }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Other cart operations (update, delete, clear) would follow similar patterns

module.exports = router;