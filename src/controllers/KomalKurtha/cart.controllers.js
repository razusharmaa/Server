import {CartItem} from "../../models/KomalKurtha/cart.models.js";
import { ApiResponse } from "../../utils/ApiResponse.utils.js";
import { asyncHandler } from "../../utils/AsyncHandler.utils.js";
// Get cart items by session ID
const getCartItems = asyncHandler(async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const items = await CartItem.find({ sessionId });
    res.json(new ApiResponse(200, items, "Cart items retrieved successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while retrieving cart items"
    );
  }
});

// Add item to cart
const addToCart = asyncHandler(async (req, res) => {
  try {
    const sessionId = req.body;
    const { productId, quantity } = req.body;

    const cartItem = new CartItem({
      productId,
      sessionId,
      quantity,
    });

    const createdCartItem = await cartItem.save();
    res
      .status(201)
      .json(
        new ApiResponse(201, createdCartItem, "Item added to cart successfully")
      );
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while adding item to cart"
    );
  }
});

// Update cart item quantity
const updateCartItem = asyncHandler(async (req, res) => {
  try {
    const { quantity } = req.body;

    const cartItem = await CartItem.findById(req.params.id);

    if (cartItem) {
      cartItem.quantity = quantity;

      const updatedCartItem = await cartItem.save();
      res.json(
        new ApiResponse(200, updatedCartItem, "Cart item updated successfully")
      );
    } else {
      res.status(404).json(new ApiResponse(404, null, "Cart item not found"));
    }
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while updating cart item"
    );
  }
});

// Remove item from cart
const removeFromCart = asyncHandler(async (req, res) => {
  try {
    const cartItem = await CartItem.findById(req.params.id);

    if (cartItem) {
      await cartItem.remove();
      res.status(204).end();
    } else {
      res.status(404).json(new ApiResponse(404, null, "Cart item not found"));
    }
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while removing item from cart"
    );
  }
});

// Clear cart
const clearCart = asyncHandler(async (req, res) => {
  try {
    const sessionId = req.sessionID;
    await CartItem.deleteMany({ sessionId });
    res.status(204).end();
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while clearing cart"
    );
  }
});

export { getCartItems, addToCart, updateCartItem, removeFromCart, clearCart };
