import { asyncHandler } from "../utils/AsyncHandler.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { User } from "../models/user.models.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudnary.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { sendMail } from "../utils/nodeMailer.utils.js";
import Mailgen from "mailgen";
import axios from "axios";

import bcrypt from "bcrypt";
import { decrypt } from "../utils/encryption.utils.js";

const GenerateRefreshAccessToken = async (userId, rememberMe = false) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken(rememberMe);
    const refreshToken = user.generateRefreshToken(rememberMe);

    // Hash the refresh token before storing it
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    user.refreshToken = hashedRefreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken }; // Return plain refreshToken for cookies
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const {
    fullname,
    email,
    username,
    password,
    recaptchaValue,
    rememberMe = false,
  } = req.body;

  // if (!recaptchaValue) {
  //   throw new ApiError(400, "reCAPTCHA value is required");
  // }

  // Verify reCAPTCHA with Google
  // const recaptchaSecret = process.env.RECAPTCHA_SECRET;
  // const recaptchaResponse = await axios.post(
  //   `https://www.google.com/recaptcha/api/siteverify`,
  //   {},
  //   {
  //     params: {
  //       secret: recaptchaSecret,
  //       response: recaptchaValue,
  //     },
  //   }
  // );

  // const { success, score, "error-codes": errorCodes } = recaptchaResponse.data;

  // if (!success || (score && score < 0.5)) {
  //   const errorMessage = errorCodes
  //     ? `reCAPTCHA failed: ${errorCodes.join(", ")}`
  //     : "reCAPTCHA verification failed";
  //   throw new ApiError(400, errorMessage);
  // }

  if (
    [fullname, email, username, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      throw new ApiError(409, "User already exists");
    }

    const user = await User.create({
      fullname,
      email,
      username: username.toLowerCase(),
      password,
      isVerified: false,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    const { accessToken, refreshToken } = await GenerateRefreshAccessToken(
      user._id,
      rememberMe
    );

    // const options = {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "none",
    //   maxAge: 24 * 60 * 60 * 1000, // 1 days in milliseconds

    // };

    await session.commitTransaction();

    return (
      res
        // .cookie("refresh_token", refreshToken, options)
        .status(201)
        .json(
          new ApiResponse(
            201,
            {
              user: createdUser,
              accessToken,
              refreshToken,
            },
            "User registered successfully. Please check your email to verify your account."
          )
        )
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(
      500,
      error.message || "An internal server error occurred"
    );
  } finally {
    session.endSession();
  }
});

// backend/controllers/authController.js
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(402, "Unable to get your email");
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, "User with that email does not exist");
    }

    // Generate a password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save(); // Save the token and expiration in the database

    // Send the reset email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailTemplate = {
      body: {
        name: user.fullname || user.username,
        intro: "You have requested to reset your password.",
        action: {
          instructions: "Click the button below to reset your password:",
          button: {
            color: "#A020F0",
            text: "Reset your password",
            link: resetLink,
          },
        },
        outro: "If you did not request this, please ignore this email.",
      },
    };

    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "Flowmotion IT Services",
        link: process.env.FRONTEND_URL,
        copyright: "© 2024 Flowmotion IT Services. All rights reserved.",
      },
    });

    const emailBody = mailGenerator.generate(emailTemplate);

    await sendMail({
      to: user.email,
      subject: "Password Reset",
      html: emailBody,
      text: "Please click the link to reset your password",
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, null, "Password reset has been sent to your email")
      );
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  try {
    // Find the user by the reset token and check if the token is still valid
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired token");
    }

    res.status(200).json(new ApiResponse(200, null, "Token is valid"));
  } catch (error) {
    throw new ApiError(500, error.message || "Server error");
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(
      400,
      "Invalid request. Token and new password are required."
    );
  }

  try {
    // Decode the token to get the user's email
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user with the matching email and token, and check if the token is still valid
    const user = await User.findOne({
      email: decoded.email,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }, // Ensure the token hasn't expired
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired token.");
    }

    // Update the user's password (pre-save hook will hash it automatically)
    user.password = newPassword;

    // Clear the reset token and its expiration
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Save the updated user document
    await user.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, null, "Password has been reset successfully.")
      );
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
    // Remove refresh token from the user document
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { refreshToken: "" } },
      { new: true }
    );

    const options = {
      httpOnly: true, // Ensures the cookie is not accessible via JavaScript (for security)
      secure: true, // Ensures the cookie is sent only over HTTPS
      sameSite: "none", // Allows cross-site cookies (required for cross-origin setups)
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds (adjust as needed)
    };

    // Clear cookies and send response
    return res
      .clearCookie("refresh_token", options)
      .status(200)
      .json(new ApiResponse(200, null, "User logged out successfully"));
  } catch (error) {
    // Log error details for debugging
    console.error("Logout error:", error);
    throw new ApiError(500, "Failed to log out");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, rememberMe, recaptchaValue } = req.body;

  if (![email, password].every(Boolean)) {
    throw new ApiError(400, "All fields are required, including reCAPTCHA");
  }
  // if (![email, password, recaptchaValue].every(Boolean)) {
  //   throw new ApiError(400, "All fields are required, including reCAPTCHA");
  // }

  // const recaptchaSecret = process.env.RECAPTCHA_SECRET;
  // const recaptchaResponse = await axios.post(
  //   `https://www.google.com/recaptcha/api/siteverify`,
  //   {},
  //   {
  //     params: {
  //       secret: recaptchaSecret,
  //       response: recaptchaValue,
  //     },
  //   }
  // );

  // const { success, score } = recaptchaResponse.data;

  // if (!success || (score && score < 0.5)) {
  //   throw new ApiError(400, "reCAPTCHA verification failed");
  // }

  const user = await User.findOne({
    $or: [{ email }, { username: email }],
  });
  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }

  // if (!user.isVerified) {
  // throw new ApiError(401, "Please verify your email to login");
  // }

  const passwordCheck = await user.isPasswordCorrect(password);
  if (!passwordCheck) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await GenerateRefreshAccessToken(
    user._id,
    rememberMe
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: rememberMe ? 6 * 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,

  };

  return res
    .cookie("refreshToken", refreshToken, options)
    .status(200)
    .json(
      new ApiResponse(200, { accessToken }, "User logged in successfully")
    );
});

// const refreshAccessToken = asyncHandler(async (req, res) => {
//   try {
//     const incomingRefreshToken = req.cookies?.refresh_token;

//     if (!incomingRefreshToken) {
//       throw new ApiError(400, "Refresh token is required");
//     }

//     // Verify the incoming refresh token's signature
//     let decodedToken;
//     try {
//       decodedToken = jwt.verify(
//         incomingRefreshToken,
//         process.env.REFRESH_TOKEN_SECRET
//       );
//     } catch (error) {
//       throw new ApiError(401, "Invalid refresh token");
//     }

//     const user = await User.findById(decodedToken._id);
//     if (!user) throw new ApiError(404, "User not found");

//     // Compare the hashed refresh token with the incoming one
//     const isTokenValid = await bcrypt.compare(
//       incomingRefreshToken,
//       user.refreshToken
//     );
//     if (!isTokenValid) {
//       throw new ApiError(400, "Invalid refresh token");
//     }

//     // Generate new access token (no new refresh token)
//     const accessToken = user.generateAccessToken();

//     // Return the new access token in response
//     return res
//       .status(200)
//       .json(
//         new ApiResponse(200, { accessToken }, "Tokens refreshed successfully")
//       );
//   } catch (error) {
//     console.error("Error:", error.message);
//     throw new ApiError(401, error.message || "Unable to refresh token");
//   }
// });

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    console.log(incomingRefreshToken);
    
    if (!incomingRefreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }

    // Verify the incoming refresh token's signature
    let decodedToken;
    try {
      decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch (error) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Find the user associated with the token
    const user = await User.findById(decodedToken._id);
    if (!user) throw new ApiError(404, "User not found");

    // Compare the hashed refresh token stored in the database
    const isTokenValid = await bcrypt.compare(
      incomingRefreshToken,
      user.refreshToken
    );
    if (!isTokenValid) {
      throw new ApiError(400, "Invalid refresh token");
    }

    // Generate a new access token
    const accessToken = user.generateAccessToken();

    // Return the new access token in the response
    return res
      .status(200)
      .json(
        new ApiResponse(200, { accessToken }, "Tokens refreshed successfully")
      );
  } catch (error) {
    console.error("Error:", error.message);
    throw new ApiError(401, error.message || "Unable to refresh token");
  }
});




const sendVerificationCode = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // Corrected with `await` and a proper model call
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (user.isVerified) {
      throw new ApiError(403, "Email is already verified");
    }

    const { email, fullname, verificationToken } = user;

    // If a token exists, decode it and check its validity
    if (verificationToken) {
      try {
        const decodedToken = jwt.verify(
          verificationToken,
          process.env.JWT_SECRET
        );
        // Check if the token is still valid (not expired)

        if (decodedToken.exp * 1000 > Date.now()) {
          // Token is still valid
          throw new ApiError(
            403,
            "Please try requesting a new verification email after 20 minutes"
          );
        }
      } catch (error) {
        // Handle specific JWT errors
        if (error.name === "TokenExpiredError") {
          // Token has expired; it's okay to create a new one
        } else {
          throw new ApiError(
            403,
            "Please try requesting a new verification email after 20 minutes"
          );
        }
      }
    }

    // Issue a new verification token and update the user record
    const newVerificationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "20m",
    });

    await User.findByIdAndUpdate(
      req.user._id,
      { verificationToken: newVerificationToken },
      { new: true }
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${newVerificationToken}`;

    const MailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "Flowmotion IT Services",
        link: process.env.FRONTEND_URL,
        copyright: "© 2024 Flowmotion IT Services. All rights reserved.",
      },
    });

    const emailTemplate = {
      body: {
        name: fullname,
        intro:
          "Welcome to Flowmotion IT Services! We're excited to have you on board.",
        action: {
          instructions:
            "To get started, please click the button below to verify your email address:",
          button: {
            color: "#A020F0",
            text: "Verify Email",
            link: verificationLink,
          },
        },
        outro:
          "If you did not create an account with us, please ignore this email.",
      },
    };

    const emailBody = MailGenerator.generate(emailTemplate);

    await sendMail({
      to: email,
      subject: "Verify Your Email",
      html: emailBody,
      text: MailGenerator.generatePlaintext(emailTemplate),
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "Verification link has been sent successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error.message ||
        "Something went wrong while sending the verification link"
    );
  }
});

const changePassword = asyncHandler(async (req, res, next) => {
  // Step 1: Get the current password and new password
  const { currentPassword, newPassword } = req.body;

  // Step 2: Check for validation
  if (!currentPassword || !newPassword) {
    throw new ApiError(401, "All fields are required");
  }

  // Ensure the new password is at least 6 characters long and does not contain spaces or is blank
  const passwordValidationRegex = /^.{6,}$/; // Ensures the password is at least 6 characters long
  const noSpacesRegex = /^\S+$/; // Ensures the password does not contain spaces

  if (
    !passwordValidationRegex.test(newPassword) ||
    !noSpacesRegex.test(newPassword)
  ) {
    throw new ApiError(
      400,
      "New password must be at least 6 characters long and cannot contain spaces"
    );
  }

  try {
    // Step 5: Get the user from DB
    const user = await User.findById(req.user._id).select("-refreshToken");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 6: Check whether the password is correct
    const passwordCheck = await user.isPasswordCorrect(currentPassword);
    if (!passwordCheck) {
      throw new ApiError(400, "Invalid current password");
    }

    // Step 7: Update the password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Step 8: Return response
    return res
      .status(200)
      .json(new ApiResponse(200, "Password changed successfully"));
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

const UpdateAccount = asyncHandler(async (req, res) => {
  // Step 1: Get the current password and new email
  const { newNumber, newName, currentPassword, newUsername, newEmail } =
    req.body;

  // Step 2: Validation for blank email or invalid email
  if (!newName || !newNumber || !newUsername || !newEmail || !currentPassword) {
    throw new ApiError(401, "All fields are required");
  }

  // Email validation regex
  const emailValidationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailValidationRegex.test(newEmail)) {
    throw new ApiError(400, "Invalid email format");
  }

  try {
    // Step 5: Get the user from DB
    const user = await User.findById(req.user._id).select("-refreshToken");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 6: Check whether the password is correct
    const passwordCheck = await user.isPasswordCorrect(currentPassword);
    if (!passwordCheck) {
      throw new ApiError(400, "Invalid current password");
    }

    // Step 7: Update the email
    if (user.email !== newEmail) {
      user.isVerified = false;
    }
    user.email = newEmail;
    user.phoneNumber = newNumber;
    user.username = newUsername;
    user.fullname = newName;
    await user.save({ validateBeforeSave: false });

    // Step 8: Return response
    return res
      .status(200)
      .json(new ApiResponse(200, "Account updated successfully"));
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

const changeAvatar = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;
  const newAvatarBuffer = req.file?.buffer;

  // Step 1: Check for avatar image
  if (!newAvatarBuffer) {
    throw new ApiError(400, "Avatar photo is required");
  }

  try {
    // Step 2: Get the user from DB, excluding the refreshToken field
    const user = await User.findById(req.user._id).select("-refreshToken");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 3: Check whether the password is correct
    const passwordCheck = await user.isPasswordCorrect(currentPassword);
    if (!passwordCheck) {
      throw new ApiError(400, "Invalid current password");
    }

    // Step 4: Delete the old avatar from Cloudinary if it exists
    if (user.publicID) {
      const deleteResult = await deleteFromCloudinary(user.publicID);
      if (!deleteResult) {
        console.error(`Failed to delete old avatar: ${user.publicID}`);
        // Handle error: You can decide whether to proceed or throw an error
      }
    }

    // Step 5: Upload the new avatar image to Cloudinary
    const avatar = await uploadOnCloudinary(
      newAvatarBuffer,
      `user-avatar-${req.user._id}`
    );
    if (!avatar) {
      throw new ApiError(500, "Failed to upload new avatar");
    }

    // Step 6: Update the user with the new avatar URL and public ID
    user.avatar = avatar.url;
    user.publicID = avatar.public_id;
    await user.save();

    // Step 7: Return response
    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar changed successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to change avatar");
  }
});

const deleteAvatar = asyncHandler(async (req, res) => {
  try {
    // Step 1: Get the user from DB to find old avatar URL
    const user = await User.findById(req.user._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 2: Delete avatar from Cloudinary server
    const oldAvatar = user.publicID;
    if (oldAvatar) {
      await deleteFromCloudinary(oldAvatar);
    }

    // Step 3: Update user avatar field in the database
    user.avatar = null;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar deleted successfully"));
  } catch (err) {
    throw new ApiError(500, err.message || "Failed to delete avatar");
  }
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  UpdateAccount,
  changeAvatar,
  deleteAvatar,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  sendVerificationCode,
};
