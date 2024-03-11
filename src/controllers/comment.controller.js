import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getAllVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const video = await Video.findById(videoId);
    if (!video)
        throw new ApiError(404, "Video not Found");

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "ownerDetails"
            }
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "comment",
                localField: "_id",
                as: "likes"
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                owner: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                },
                createdAt: 1,
                totalLikes: 1,
                isLiked: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comments = await Comment.aggregatePaginate(commentAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "successfully fetched all comments"));

})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Content is required");
    }
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "video not found");
    }
    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment)
        throw new ApiError(500, "Failed to add a comment");

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "successfully added the comment"));
})

const updateComment = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { commentId } = req.params

    if (!content)
        throw new ApiError(400, "content is required");

    const comment = await Comment.findById(commentId);
    if (!comment)
        throw new ApiError(400, "Comment not found");

    if (comment?.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "you can't edit the comment as you are not owner");

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content
            }
        },
        { new: true }
    )

    // console.log("this is updated comment : ",updatedComment)

    if (!updatedComment)
        throw new ApiError(500, "can't update the comment");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "comment updated successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment)
        throw new ApiError(400, "comment not found");

    if (comment?.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "You can't delete the comment as you are not owner");

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment)
        throw new ApiError(500, "failed to delete a comment ");

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Successfully deleted the comment"))

})

export {
    getAllVideoComments,
    addComment,
    updateComment,
    deleteComment
}