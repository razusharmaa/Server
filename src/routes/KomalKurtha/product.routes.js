
import express from 'express';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getFeaturedProducts, 
  contactUsKomal
} from '../../controllers/KomalKurtha/product.controllers.js';
import { loginUser } from '../../controllers/user.controllers.js';
import { VerifyJWT } from '../../middleware/auth.middleware.js';
const router = express.Router();


// Route: Contact US
router.route('/contact')
  .post(contactUsKomal);

// Route: /api/products
router.route('/')
  .get(getProducts)
  .post(VerifyJWT,createProduct);

// Route: /api/products/featured
router.get('/featured', getFeaturedProducts);


// Route: /api/products/:id
router.route('/:id')
  .get(getProductById)
  .put(VerifyJWT,updateProduct)
  .delete(VerifyJWT,deleteProduct);

export default router;
