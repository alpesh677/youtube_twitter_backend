import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: Create a tweet

    const { content } = req.body;

    if (!content)
        throw new ApiError(400, "content is required");

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet)
        throw new ApiError(500, "Failed to upload the tweet")

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "successfully created a tweet"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    //TODO: get all User tweets
    const {userId} = req.params

    if(!isValidObjectId(userId))
        throw new ApiError(400, "Invalid user id");

    const tweets = await Tweet.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from : "users",
                foreignField: "_id",
                localField : "owner",
                as:"ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from : "likes",
                foreignField: "tweet",
                localField: "_id",
                as: "likeDetails",
                pipeline:[
                    {
                        $project:{
                            likedBy : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                ownerDetails : {
                    $first : "$ownerDetails"
                },
                likeDetails : {
                    $first : "$likeDetails"
                },
                likeCount:{
                    $size: "$likeDetails"
                },
                isLiked:{
                    $cond:{
                        if: {in : [req.user._id,"$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt : -1
            }
        },
        {
            $project:{
                content: 1,
                ownerDetails: 1,
                likeDetails : 1,
                likeCount : 1,
                isLiked : 1,
                createdAt : 1
            }
        }
    ])

    return res
            .status(200)
            .json(new ApiResponse(200, tweets, "successfully fetched all tweets of user"));

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update the tweet
    const { content } = req.body;
    const { tweetId } = req.params

    if (!content)
        throw new ApiError(400, "content is required");

    if (!isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid tweet id");

    const tweet = await Tweet.findById(tweetId);

    if (!tweet)
        throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "you can't update the tweet as you are not the owner");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content
            }
        },
        {
            new : true
        }        
    )

    if(!updatedTweet)
        throw new ApiError(500, "Failed to update the tweet");

    return res
            .status(200)
            .json(new ApiResponse(200, updatedTweet, "Successfullt updated the tweet"));
});


const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete a tweet
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid tweetID");

    const tweet = await Tweet.findById(tweetId);
    if(!tweet)
        throw new ApiError(404, "Tweet not found");

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "You can't delete the tweet as you are not the onwer")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if(!deleteTweet)
        throw new ApiError(500, "failed to delete a video");

    return res
            .status(200)
            .json(new ApiResponse(200, {},"successfully deleted the tweet"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}