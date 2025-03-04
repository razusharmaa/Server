import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { asyncHandler } from "../utils/AsyncHandler.utils.js";

export const VerifyAdmin = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user; // The user should already be set in the request by the VerifyJWT middleware

    if (!user) {
      throw new ApiError(401, "Unauthorized: No user found.");
    }
    const isAdmin = Array.isArray(user.role) && user.role.includes(3821);

    if (!isAdmin) {
      throw new ApiError(403, "Forbidden: Access is denied.");
    }

    next();
  } catch (error) {
    throw new ApiError(403, error?.message || "Forbidden: Access is denied.");
  }
});
