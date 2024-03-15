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

    const isSubscribed = await Subscription.findOne({
        channel: channelId
    });

    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscibed: false }, "state changed to unsubscribed"));
    }

    await Subscription.create({
        channel: channelId
    })

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
                foreignField: "_id",
                localField: "channel",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            foreignField: "channel",
                            localField: "_id",
                            as: "subscribedToChannel"
                        }
                    },
                    {
                        $addFields: {
                            subscribedToChannel: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToChannel.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                    subscribedToChannel: 1
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userSubcribers,
                "subscribers fetched successfully"
            )
        );
})

const getsubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getsubscribedChannels
}