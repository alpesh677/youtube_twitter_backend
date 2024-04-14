import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscriptions.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelID");
    }

    // const isSubscribed = await Subscription.findOne({
    //     channel: channelId
    // });
    const isSubscribed = await Subscription.findOne({
        //  subscriber:  req.user?._id
        $and: [{ subscriber: req.user?._id }, { channel: channelId }]
    });

    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscibed: false }, "state changed to unsubscribed"));
    }
    await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isSubscribed: true }, "state changed to subscribed"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    let { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID")
    }

    channelId = new mongoose.Types.ObjectId(channelId);

    const userSubcribers = await Subscription.aggregate([
        {
            $match: {
                channel: channelId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                ]
            }
        },
        {
            $addFields: {
                subDetails: {
                    $first: "$subscriberDetail"
                }
            }
        },
        {
            $project: {
                _id: 0,
                subscribers: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    channelID: channelId,
                    subscribersCount: userSubcribers?.length,
                    subscribers: userSubcribers
                },
                "subscribers fetched successfully"
            )
        );
})
// controller to return channel list to which user has subscribed
const getsubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        new ApiResponse(400, "Invalid subscriber ID");
    }

    const subscriber = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedTo",
            }
        },
        {
            $addFields: {
                isSubscribedTo: {
                    $cond: {
                        if: { $in: [req.user?.id, "$subscribedTo._id"] },
                        then: true,
                        else: false
                    }
                },
                subToDetails: {
                    $first: "$subscribedTo"
                },
            }
        },
        {
            $project: {
                _id: 0,
                isSubscribedTo: 1,
                subscribedTo: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                }
            }
        }
    ]);

    if (!subscriber?.length < 0) {
        ApiError(400, "channels not found")
    }
    res
        .status(200)
        .json(new ApiResponse(200,
            {
                subscriberID: subscriberId,
                subscribersCount: subscriber?.length,
                subscribers: subscriber
            }
            , "Subscribers list fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getsubscribedChannels
}