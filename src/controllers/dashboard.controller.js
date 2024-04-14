import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelId = req.user?._id;
    // console.log(channelId);

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelID");
    }
    const channelStates = await Video.aggregate([
        {
            '$match': {
                'owner': new mongoose.Types.ObjectId(channelId)
            }
        }, {
            '$lookup': {
                'from': 'likes',
                'localField': '_id',
                'foreignField': 'video',
                'as': 'likes'
            }
        }, {
            '$lookup': {
                'from': 'subscriptions',
                'localField': 'owner',
                'foreignField': 'channel',
                'as': 'totalsub'
            }
        }, {
            '$group': {
                '_id': null,
                'totalvideos': {
                    '$sum': 1
                },
                'totalviews': {
                    '$sum': '$views'
                },
                'totallikes': {
                    '$first': {
                        '$size': '$likes'
                    }
                },
                'totalsubs': {
                    '$first': {
                        '$size': '$totalsub'
                    }
                }
            }
        }, {
            '$project': {
                'totalvideos': 1,
                'totalviews': 1,
                'totallikes': 1,
                'totalsubs': 1
            }
        }
    ]);

    // console.log(channelStates);

    if (channelStates.length <= 0) {
        throw new ApiError(400, "failed to fetched channel status");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channelStates, "channel status fetched successfully")
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channel = req.user?._id;

    if(!isValidObjectId(channel)){
        throw new ApiError(400, "Invalid Channel ID");
    }

    const channelVideos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(channel)
            }
        },
        {
            $project : {
                description : 0,
                isPublished : 0,
            }
        }
    ])

    return res
            .status(200)
            .json(new ApiResponse(200, channelVideos, "videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
