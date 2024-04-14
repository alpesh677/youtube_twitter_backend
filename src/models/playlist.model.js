import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema({
    description : {
        type : String,
        required : true
    },
    name:{
        type : String,
        required : true
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    video : {
        type : Schema.Types.ObjectId,
        ref : "Video"
    }
},{timestamps : true})

export const Playlist = mongoose.model("Playlist", playlistSchema);
