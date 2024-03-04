class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something Went Wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data= null
        this.message = message
        this.success = false;
        this.errors = errors;

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructor);
        }
    }
}

export {ApiError};

/**
 * Constructs a new instance of the class.
 *
 * @constructor
 * @param {number} statusCode - The HTTP status code.
 * @param {string} [message="Something Went Wrong"] - The error message.
 * @param {Array} [errors=[]] - The array of error messages.
 * @param {string} [stack=""] - The error stack trace.
 */