import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

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
        },
    },
        {
            $unwind: {
                path: "$ownerDetails"
            }
        }

    )

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
    const { title, description } = req.body;

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "videoFileLocalPath is required");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnailLocalPath is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail not found");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: req.user?._id,
        isPublished: false
    });

    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));

});

const getVideoByID = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid Video ID");
    }

    const video = Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "video",
                localField: "_id",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            foreignField: "channel",
                            localField: "_id",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            totalSubscribers: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?.id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            totalSubscribers: 1,
                            isSubscribed: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                likeCount: {
                    $size: "$likes",
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                isLiked: 1,
                likeCount: 1,
            }
        }
    ]);

    if (!video) {
        throw new ApiError(500, "failed to fetch a video")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "video detailes fetched succussfully !!"))
});

const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!(title && description)) {
        throw new ApiError(400, "title and description are required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't edit this video as you are not the owner"
        );
    }

    //REVIEW: it's showing undefined
    // deleting old thumbnail and updating with new one
    // const thumbnailToDelete = video.thumbnail.public_id;

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new ApiError(400, "thumbnail not found");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video please try again");
    }

    //REVIEW: delete is not working
    // if (updatedVideo) {
    //     await deleteOnCloudinary(thumbnailToDelete);
    // }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
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

    if (video?.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "You can't delete video as you are not owner");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);
    console.log(deleteAVideo);
    if (!deletedVideo) {
        throw new ApiError(404, "failed to delete a video or video not found");
    }

    await deleteOnCloudinary(video.videoFile.public_id, "video")
    await deleteOnCloudinary(video.thumbnail.public_id);

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