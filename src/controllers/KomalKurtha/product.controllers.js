import { KomalKurtha, KomalKurtha_Email, KomalKurtha_OWNER, MAIN_URL_KOMAL, PROVIDER_NAME } from "../../constant.js";
import {Product} from "../../models/KomalKurtha/productmodels.js";
import { ApiError } from "../../utils/ApiError.utils.js";
import { ApiResponse } from "../../utils/ApiResponse.utils.js";
import { asyncHandler } from "../../utils/AsyncHandler.utils.js";
import { sendMail } from "../../utils/nodeMailer.utils.js";
import Mailgen from "mailgen";
// Get all products
const getProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(new ApiResponse(200, product, "Product retrieved successfully"));
    } else {
      res.status(404).json(new ApiResponse(404, null, "Product not found"));
    }
  } catch (error) {
    throw new ApiError(
      500,
      error.message ||
        "Some error occurred while retrieving product with id: " + req.params.id
    );
  }
};

// Create a new product
const createProduct = asyncHandler(async (req, res) => {
  try {
    const { name, description, price, imageUrl, category, featured, stock,sold } =
      req.body;

    if (!name || !description || !price || !imageUrl || !category || !stock) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const product = new Product({
      name,
      description,
      price,
      imageUrl,
      category,
      featured,
      stock,
      sold
    });

    const createdProduct = await product.save();
    res
      .status(201)
      .json(
        new ApiResponse(201, createdProduct, "Product created successfully")
      );
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while creating the product"
    );
  }
});

// Update a product
const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { name, description, price, imageUrl, category, featured, stock } =
      req.body;

    if (!name || !description || !price || !imageUrl || !category || !stock) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.description = description || product.description;
      product.price = price || product.price;
      product.imageUrl = imageUrl || product.imageUrl;
      product.category = category || product.category;
      product.featured = featured !== undefined ? featured : product.featured;
      product.stock = stock || product.stock;

      const updatedProduct = await product.save();
      res.json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
      );
    } else {
      res.status(404).json(new ApiResponse(404, null, "Product not found"));
    }
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while updating the product"
    );
  }
});

// Delete a product
const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json(new ApiResponse(404, null, "Product not found"));
    }

    res.status(204).end();
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while deleting the product"
    );
  }
});
// Get featured products
const getFeaturedProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({ featured: true });
    res.json(
      new ApiResponse(200, products, "Featured products retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Some error occurred while retrieving featured products"
    );
  }
});




const contactUsKomal = asyncHandler(async (req, res) => {
  const { fullname, email, message } = req.body;

  // Validate required fields
  if (!fullname || !email || !message) {
    throw new ApiError(400, "All fields are required");
  }

  try {
    const MailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: KomalKurtha,
        link: MAIN_URL_KOMAL,
        copyright: `© ${new Date().getFullYear()} ${KomalKurtha_OWNER}. All rights reserved.`,
      },
    });

    // const emailTemplate = {
    //   body: {
    //     name: KomalKurtha_OWNER,
    //     intro: [
    //       `You have a new contact form submission from ${fullname}`,
    //       `Sender's email: ${email}`
    //     ],
    //     content: {
    //       title: "Message:",
    //       body: message
    //     },
    //     outro: "Please respond to this inquiry at your earliest convenience."
    //   },
    // };
    const emailTemplate = {
      body: {
        name: KomalKurtha_OWNER,
        intro: [
          `You have a new contact form submission from ${fullname}`,
          `Sender's email: ${email}`,
          `Message: ${message}`
        ],
        outro: "Please respond to this inquiry at your earliest convenience."
      },
    };
    
    const emailBody = MailGenerator.generate(emailTemplate);
    const emailText = MailGenerator.generatePlaintext(emailTemplate);

    // Implement your email sending logic here (using Nodemailer or other service)
    await sendMail({
      to: KomalKurtha_Email,
      subject: `New Contact Form Submission from ${fullname}`,
      html: emailBody,
      text: emailText,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Your message has been sent successfully!"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      error.message ||
      "Failed to send message. Please try again later."
    );
  }
});

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  contactUsKomal
};
