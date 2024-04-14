import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getsubscribedChannels
} from "../controllers/subscription.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT)

router
    .route("/c/:channelId")
    .post(verifyJWT, toggleSubscription)
    .get(getUserChannelSubscribers);

router.route("/u/:subscriberId").get(getsubscribedChannels);

export default router