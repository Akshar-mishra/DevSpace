import { submitCode } from "../controllers/code.controller.js"
import {Router} from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router= Router()

router.use(verifyJWT)

router.post("/run",submitCode)

export default router 