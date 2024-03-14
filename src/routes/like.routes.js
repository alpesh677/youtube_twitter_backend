import { Router } from "express";
import {
    getLikedVideos,
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
    getLikedTweets,
} from "../controllers/like.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
const router = Router();

router.use(verifyJWT);

router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike)
router.route("/videos").get(getLikedVideos);
router.route("/tweets").get(getLikedTweets);

export default router;
