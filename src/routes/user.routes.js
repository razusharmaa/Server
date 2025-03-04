import { Router } from "express";
import { registerUser,loginUser,logoutUser,refreshAccessToken,changePassword, UpdateAccount, deleteAvatar, changeAvatar, requestPasswordReset, verifyResetToken, resetPassword, sendVerificationCode} from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import { VerifyJWT } from "../middleware/auth.middleware.js";
import {verifyEmail } from "../controllers/sendMail.controllers.js";

const router=Router();


// router.route('/checkCookie').post(checkCookie)
// router.route('/logCookie').post(logCookie)
// router.route('/migration').get(migrateServiceCache)


router.route('/register').post(registerUser)

router.route('/login').post(loginUser)

//Secure routes
router.route('/refresh-token').get(refreshAccessToken)

// secure routes
router.route('/logout').get(VerifyJWT, logoutUser)
router.route('/changepsk').post(VerifyJWT,changePassword)
router.route('/updateAccount').post(VerifyJWT,UpdateAccount)
router.route('/deleteAvatar').post(VerifyJWT,deleteAvatar)
router.route('/changeAvatar').post(VerifyJWT,upload.single("newAvatar"),changeAvatar)
router.route('/sendMailVerification').get(VerifyJWT,sendVerificationCode);


router.route('/verify-email').get(verifyEmail);
router.route('/reset-password').post(resetPassword);
router.route('/forgot-password').post(requestPasswordReset);
router.route('/verify-reset-token').get(verifyResetToken);
router.route('/refresh-token').post(refreshAccessToken);


export default router