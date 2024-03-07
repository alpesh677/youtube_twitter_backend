import mongoose, { Aggregate, isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { Video } from "../models/video.model";
import { uploadOnCloudinar, deleteOnCludinary } from "../utils/cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: pagination and sort new things 

    console.log("user Id :", userId);

    const pipeline = [];
    // NOTE: search the title and description based on query on search-videos index
    if (query) {
        pipeline.push({
            $search: {
                "index": "search-videos",
                "text": {
                    "path": ["title", "description"],
                    "query": query
                }
            }
        });
    }


    //NOTE: filter the documents based in userID
    if (userId) {
        if (!isValidObjectId(userId))
            throw new ApiError(404, "Invalid User ID");
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }


    //NOTE: give only published videos
    pipeline.push({
        $match: {
            isPublished: true
        }
    })

    //NOTE: sort the documents sortBy is field by which you want to sort and sortType is sort direction
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {   //REVIEW:
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        })
    }


    //NOTE: if sort is not provided sort the videos on its creation time desc
    pipeline.push({
        $sort: {
            createdAt: -1
        }
    })

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
            pipeline: [
                {
                    $project: {
                        username: 1,
                        avatar: 1,
                    }
                }
            ],
        }
    })

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    //NOTE: aggregatePaginate returns the promise so it should be await !!!
    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "data fetched successfully"));


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

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail file is required");
    }
    if (!videoLocalPath) {
        throw new ApiError(400, "video file is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    const videoPath = await uploadOnCloudinary(videoLocalPath);

    if (!thumbnail) {
        throw new ApiError(400, "thumbnail file is required")
    }
    if (!videoPath) {
        throw new ApiError(400, "video file is required")
    }

    const video = await Video.create({
        videoFile: {
            url: videoPath.url,
            public_id: videoPath.public_id
        },
        thumbnail: {
            url: videoPath.url,
            public_id: videoPath.public_id
        },
        title,
        description,
        duration: videoPath.duration, //REVIEW: partially
        isPublished: false,
        owner: req.user?._id
    });

    const videoUpload = await Video.findById(video._id);

    if (!videoUpload) {
        throw new ApiError(500, "VideoUpload failed please try again later");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "video uploaded successfully")
        )

});

const getVideoByID = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
});

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params;
    const { title, description } = req.body;


    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }
    if (!title && description) {
        throw new ApiError(400, "Title and description are required");
    }


    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video?.owner.toString() === req.user?._id.toString()) {
        throw new ApiError(400, "You can't update video files as you are not owner")
    }

    //const thumbnailToDelete =  //TODO: how can I DELETE It

    const thumbnail = req.fields?.thumbnail[0].path;

    if (!thumbnail) {
        throw new ApiError(400, "thumbnail file is required");
    }

    const thumbnailPath = await uploadOnCloudinary(thumbnail);

    if (!thumbnailPath) {
        throw new ApiError(404, "thumbnail not found !!!")
    }

    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    url: thumbnailPath,
                    public_id: thumbnailPath.public_id
                }
            }
        },
        {
            new: true
        }
    )
    if (!updateVideo) {
        throw new ApiError(500, "Failed to update video details videos");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updateVideo, "Video details updates successfully")
        )
});


const deleteAVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video?.owner.toString() !== req.user?._id) {
        throw new ApiError(400, "You can't delete video as you are not owner");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
        throw new ApiError(404, "failed to delete a video or video not found");
    }

    await deleteOnCludinary(video.videoFile.public_id, "video")
    await deleteOnCludinary(video.thumbnail.public_id);

    //TODO: Delete Comments related to VIDEO
    //TODO: Delete Likes Related To VIDEO

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "video deleted successfully")
        )
})


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId);

    if (video?.owner.toString() !== req.user?._id) {
        throw new ApiError(400, 400, "You can't update video status as you are not owner")
    }

    const toggleStatus = Video.findByIdAndUpdate(
        videoId,
        {
            isPublished: !video?.isPublished
        },
        { new: true }
    )

    if (!toggleStatus) {
        throw new ApiError(500, "failed to update status");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, toggleStatus.isPublished, "publish status updated successfully")
        )
})

export {
    getAllVideos,
    publishAVideo,
    updateVideo,
    getVideoByID,
    deleteAVideo,
    togglePublishStatus
}