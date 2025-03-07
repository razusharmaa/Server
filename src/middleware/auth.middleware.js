import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { asyncHandler } from "../utils/AsyncHandler.utils.js";

export const VerifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = 
      req.cookies?.accessToken || 
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Find user and exclude sensitive fields
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Token expired");
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, "Invalid token");
    }

    // Pass through other ApiErrors
    if (error instanceof ApiError) {
      throw error;
    }

    // Fallback for unexpected errors
    throw new ApiError(401, "Invalid access token");
  }
});


// export const VerifyJWT = asyncHandler(async (req, res, next) => {
//   try {
//     const authHeader = req.header("Authorization");
//     const token = authHeader && authHeader.startsWith("Bearer ")
//       ? authHeader.replace("Bearer ", "")
//       : null;

//     console.log("Received Token:", token);

//     if (!token) {
//       throw new ApiError(401, "Unauthorized request");
//     }

//     let decodedToken;
//     try {
//       decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         throw new ApiError(403, "Session expired, please log in again");
//       } else {
//         throw new ApiError(403, "Invalid access token");
//       }
//     }

//     const user = decodedToken?._id
//       ? await User.findById(decodedToken._id).select("-password -refreshToken")
//       : null;

//     if (!user) {
//       throw new ApiError(403, "Invalid access token");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     // console.error("JWT Middleware Error:", error.message);
//     throw new ApiError(403, "Authentication failed");
//   }
// });
