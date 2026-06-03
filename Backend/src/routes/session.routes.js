import {submitFeedback,getMySessions,getSessionById,deleteSession} from "../controllers/session.controller.js"
import {Router} from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"  
import { restrictToInterviewer } from "../middlewares/role.middleware.js"  

const router= Router()

router.use(verifyJWT)

router.route("/my-sessions").get(getMySessions)
router.route("/:sessionId").get(getSessionById)
router.route("/:sessionId/feedback").put(restrictToInterviewer, submitFeedback)
router.route("/:sessionId").get(getSessionById).delete(deleteSession)
export default router
 