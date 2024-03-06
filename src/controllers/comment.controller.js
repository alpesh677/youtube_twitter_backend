import mongoose from "mongoose";
import { Comment } from "../models/comment.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const getAllVideoComments = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
})

const addComment = asyncHandler(async(req,res)=>{
    const {content} = req.body;
})

const updateComment = asyncHandler(async(req,res)=>{

})

const deleteComment = asyncHandler(async(req,res)=>{

})

export {
    getAllVideoComments,
    addComment,
    updateComment,
    deleteComment
}