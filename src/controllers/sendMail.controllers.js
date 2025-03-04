import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/AsyncHandler.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";

// backend/controllers/verifyEmailController.js

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Token is missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      email: decoded.email,
      verificationToken: token,
    });

    if (!user) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or expired token"));
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Email verified successfully"));
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json(new ApiError(400, "Token has expired"));
    }

    return res
      .status(500)
      .json(new ApiError(500, error.message || "Something went wrong"));
  }
});

export { verifyEmail };
