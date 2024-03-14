import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "video not found");
    }
    // findOne return an updated object so it has all values of like model
    const isliked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (isliked) {
        await Like.findByIdAndDelete(isliked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "state changed to unliked"));
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "state chnged to liked"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId))
        throw new ApiError(400, "Invalid Object ID")

    const isLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (isLiked) {
        await Like.findByIdAndDelete(isLiked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "state changed to unliked"));
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "state changed to like"));
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid Tweet ID");

    const isLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (isLiked) {
        await Like.findByIdAndDelete(isLiked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "state changed to liked"));
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "state changed to TRUE"));
})

const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "_id",
                localField: "video",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "owner",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$ownerDetails"
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$videoDetails"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                videoDetails: {
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    owner: 1,
                    ownerDetails: {
                        username: 1,
                        avatar: 1
                    }
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "successfully fetched the liked videos"));
})


const getLikedTweets = asyncHandler(async (req, res) => {
    const likedTweets = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "tweets",
                foreignField: "_id",
                localField: "tweet",
                as: "tweetDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "owner",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$ownerDetails"
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$tweetDetails"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                tweetDetails: {
                    content: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        avatar: 1,
                    }
                }
            },
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedTweets, "successfully fetched liked Tweets"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getLikedTweets
}