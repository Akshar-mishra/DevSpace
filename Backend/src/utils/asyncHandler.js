export const asyncHandler = (reqHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(reqHandler(req,res,next))
        .catch((err)=>next(err))
    }
}

//promise is =>“An object that represents the eventual completion (or failure) of an async operation”
