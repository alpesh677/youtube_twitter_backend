import { Router } from "express";
import {
    getAllVideoComments,
    addComment,
    updateComment,
    deleteComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router();
router.use(verifyJWT);

router
    .route("/:videoId")
    .get(getAllVideoComments)
    .post(addComment);

router
    .route("/c/:commentId")
    .patch(updateComment)
    .delete(deleteComment);

export default router;