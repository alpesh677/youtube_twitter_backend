import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,           //to make field searchable more optimizily add index property
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String,         //cloudinary url
        required: true,
    },
    coverImage: {
        type: String,         //cloudinary url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video",
        }
    ],
    password: {
        type: String,
        required: [true, "Password is required"]  //If it's not provided, the string "Password is required" will be used as the error message.
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true })

/**
 * Pre-save hook for userSchema.
 * If the password field is not modified, it skips the hashing process.
 * If the password field is modified, it hashes the password before saving.
 *
 * @param {function} next - The next middleware to be called.
 * @returns {function} - The next middleware.
 */
userSchema.pre("save", async function (next) {          //pre save hook...
    // If the password is not modified, skip to next middleware
    if (!this.isModified("password")) return next();

    // Hash the password with bcrypt
    this.password = await bcrypt.hash(this.password, 10)

    // Call the next middleware
    next()
})


/**
 * Asynchronous function to check if the provided password matches the user's password.
 * @param {string} password - The password to be checked.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the password is correct.
 */
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}
//Method to generate an access token for a user.
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SERCRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SERCRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}


export const User = mongoose.model("User", userSchema);