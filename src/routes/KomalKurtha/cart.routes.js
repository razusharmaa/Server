import express from "express";
import {
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../../controllers/KomalKurtha/cart.controllers.js";

const router = express.Router();

// Route: /api/cart
router
  .route("/")
  .get(getCartItems)       // GET /api/cart
  .post(addToCart)         // POST /api/cart
  .delete(clearCart);      // DELETE /api/cart

// Route: /api/cart/:id
router
  .route("/:id")
  .patch(updateCartItem)    // PATCH /api/cart/:id
  .delete(removeFromCart);  // DELETE /api/cart/:id

export default router;