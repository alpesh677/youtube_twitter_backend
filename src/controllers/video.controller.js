import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { Video } from "../models/video.model";
import { uploadOnCloudinary } from "../utils/cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: pagination and sort new things 
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiResponse(400, "Title and description is required");
    }

    const thumbnailLocalPath = req.fields?.thumbnail[0].path;
    const videoLocalPath = req.files?.videoFile[0].path;

    if(!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail file is required");
    }
    if(!videoLocalPath){
        throw new ApiError(400, "video file is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    const videoPath = await uploadOnCloudinary(videoLocalPath);

    if(!thumbnail){
        throw new ApiError(400, "thumbnail file is required")
    }
    if(!videoPath){
        throw new ApiError(400, "video file is required")
    }

    const video = await Video.create({
        videoFile : {
            url : videoPath.url,
            public_id: videoPath.public_id
        },
        thumbnail:{
            url : videoPath.url,
            public_id : videoPath.public_id
        },
        title,
        description,
        duration : videoPath.duration, //REVIEW: partially
        isPublished : false,
        owner : req.user?._id
    });

    const videoUpload = await Video.findById(video._id);

    if(!videoUpload){
        throw new ApiError(500,"VideoUpload failed please try again later");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "video uploaded successfully")
        )
    
});

export {
    getAllVideos,
    publishAVideo
}