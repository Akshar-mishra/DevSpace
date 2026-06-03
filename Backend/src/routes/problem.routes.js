import { Router } from "express"
import {createProblem} from "../controllers/problem.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { restrictToInterviewer } from "../middlewares/role.middleware.js"

const router = Router()

router.use(verifyJWT)
router.route("/generate").post(restrictToInterviewer, createProblem)

export default router 