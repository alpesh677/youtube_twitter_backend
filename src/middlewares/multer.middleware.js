import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) { //this is for the selecting the destination for the file
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) { //this is for the naming the file to be uploaded
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage: storage,
})


/**
 * 
 * * @param {function} cb - The callback to be invoked when the filename is set.
 */