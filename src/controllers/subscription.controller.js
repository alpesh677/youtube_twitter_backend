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

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel ID")
    }

    const userSubcribers = Subscription.aggregate([
        {
            $match : {
                channel : channelId
            }
        },
        {
            $lookup : {
                from : "users",
                foreignField: "_id",
                localField : "channel",
                as: "userDetails",
                pipeline: [
                    {
                        
                    }
                ]
            }
        }
    ])
})

const getsubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getsubscribedChannels
}