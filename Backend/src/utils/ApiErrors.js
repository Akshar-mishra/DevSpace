class ApiErrors extends Error {
    constructor ( statusCode, message="somthing went wrogn" , stack=" ", errors=[] ){
        super(message),
        this.statusCode=statusCode
        this.message=message
        this.errors=errors 
        this.data = null
        this.success = false

        if (stack) {
            this.stack = stack
        }
        else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export {ApiErrors}

//stack-> err kaha hua uska full path
//benifit of this js :-  ✅ HTTP status included
//✅ Structured response
//✅ Cleaner frontend handling
//✅ Debug-friendly (stack trace)
//✅ Scalable for large projects