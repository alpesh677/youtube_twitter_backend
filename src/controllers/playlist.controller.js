import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    //TODO: create playlist
    if (!name || !description || !name.trim() || !description.trim()) {
        throw new ApiError(404, "Name and description is required");
    }

    const playList = await Playlist.create({
        name: name,
        description: description,
        owner: req.user._id,
        video : null
    });

    if (!playList) {
        throw new ApiError(400, "failed to create a playList");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playList, "successfully created PlayList"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const { userId } = req.params

    const userPlayList = await Playlist.find({
        owner: userId
    })

    if (!userPlayList)
        throw new ApiError(404, "playlist not found");

    return res
        .status(200)
        .json(new ApiResponse(200, userPlayList, "user playlist fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const { playlistId } = req.params

    const playListById = await Playlist.findById(playlistId);

    if (!playListById)
        throw new ApiResponse(404, "PlayList not found");

    return res
        .status(200)
        .json(new ApiResponse(200, playListById, "PlayList retrived successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Invalid playlist ID");
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId);
    if (!video)
        throw new ApiError(404, "video not found")
    const playlist= await Playlist.findById(playlistId);
    if(playlist.video.toString() === videoId.toString()){
        return res
                .status(200)
                .json(new ApiResponse(200, {}, "video already exist in playlist"));
    }

    const addVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                video: videoId
            }
        },
        {
            new: true,
        }
    );

    if (!addVideo)
        throw new ApiError(400, "Failed to Add video to playlist");

    return res
        .status(200)
        .json(new ApiResponse(200, addVideo, "Video added successfully"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Invalid PlayList ID");
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId)
    const playlist = await Playlist.findById(playlistId);

    if(playlist.video === null){
        return res
                .status(200)
                .json(new ApiResponse(200,{},"video doesn't exist"));
    }

    if (!video)
        throw new ApiError(404, "Video not found");

    const deletedVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                video: null
            }
        },
        {
            new: true
        }
    );

    if (!deletedVideo)
        throw new ApiError(400, "failed to delete a video");

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "video removed from playlist successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Invalid playlist");

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if (!playlist)
        throw new ApiError(400, "failed to delete playlist");

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "playlist deleted successfully"));

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Invalid Playlist ID");

    if (!name.trim() && !description.trim()) {
        throw new ApiError(400, "Playlist name and description is required")
    }

    const updatedPlayList = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name,
                description: description
            }
        },
        {
            new: true
        }
    );

    if (!updatedPlayList)
        throw new ApiError(400, "failed to update playlist");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlayList, "updated playlist successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}