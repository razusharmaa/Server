import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { asyncHandler } from "../utils/AsyncHandler.utils.js";

export const VerifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;

    // console.log("Received Token:", token);

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new ApiError(403, "Session expired, please log in again");
      } else {
        throw new ApiError(403, "Invalid access token");
      }
    }

    const user = decodedToken?._id
      ? await User.findById(decodedToken._id).select("-password -refreshToken")
      : null;

    if (!user) {
      throw new ApiError(403, "Invalid access token");
    }

    req.user = user;
    next();
  } catch (error) {
    // console.error("JWT Middleware Error:", error.message);
    throw new ApiError(403, "Authentication failed");
  }
});



// export const VerifyJWT = asyncHandler(async (req, res, next) => {
//   try {
//     if (process.env.NODE_ENV === 'development') {
//       // Bypass authentication in development mode
//       const user = await User.findOne({ _id: 'your_user_id' }).select("-password -refreshToken");
//       if (!user) {
//         throw new ApiError(401, "User not found");
//       }
//       req.user = user;
//       return next();
//     }

//     const token = req.cookies?.access_token || req.header("Authorization")?.replace('Bearer ', '');
//     if (!token) {
//       throw new ApiError(401, "Unauthorized request");
//     }

//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

//     if (!user) {
//       throw new ApiError(401, "Invalid access token");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     // console.log(error);
//     throw new ApiError(401, error?.message || "Invalid access token");
//   }
// });


