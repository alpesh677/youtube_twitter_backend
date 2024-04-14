import { Router } from "express";
import { 
    getAllVideos, 
    publishAVideo,
    getVideoByID,
    updateVideo,
    deleteAVideo,
    togglePublishStatus
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
// router.use(verifyJWT)

router
    .route("/")
    .get(getAllVideos)
    .post(verifyJWT,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .get(verifyJWT,getVideoByID)
    .delete(verifyJWT,deleteAVideo)
    .patch(upload.single("thumbnail"),verifyJWT, updateVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT,togglePublishStatus);

export default router