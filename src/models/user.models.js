import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
    },
    publicID: {
      type: String,
    },
    roleName: {
      type: String,
      default: 'Junior',
    },
    role: {
      type: [Number],
      default: [1121],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (value) => {
          // Check if email is in correct format
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    phoneNumber: {
      type: Number,
      minlength: 10,
      maxlength: 16,
      default: null, // Allow null values
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    refreshToken: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,  // New field for email verification status
    },
    verificationToken: {
      type: String,  // Field for storing the verification token for registration
    },
    passwordResetToken: {
      type: String,  // Field for storing the password reset token
    },
    passwordResetExpires: {
      type: Date,    // Field for storing the expiration time of the reset token
    },
  },
  { timestamps: true }
);

// Middleware to hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    return next(error); // Properly handle errors
  }
});

// Method to check if password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate access token
// Inside User model

userSchema.methods.generateAccessToken = function (rememberMe = false) {
  const expiresIn = rememberMe
    ? process.env.ACCESS_TOKEN_REMEMBER_EXPIRY
    : process.env.ACCESS_TOKEN_EXPIRY;
  return jwt.sign(
    { _id: this._id, email: this.email, username: this.username },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn }
  );
};

userSchema.methods.generateRefreshToken = function (rememberMe = false) {
  const expiresIn = rememberMe
    ? process.env.REFRESH_TOKEN_REMEMBER_EXPIRY
    : process.env.REFRESH_TOKEN_EXPIRY;
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn }
  );
};



// Method to generate verification token for email verification
userSchema.methods.generateVerificationToken = function () {
  return jwt.sign(
    { email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: '50min' }  // Token expires in 5 minutes
  );
};

// Method to generate password reset token


userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = jwt.sign(
    { email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: '15min' }  // Token expires in 15 minutes
  );

  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes from now
  return resetToken;
};


export const User = mongoose.model("User", userSchema);
