import { Router } from "express"  
import {createRoom,joinRoom,getRoomById,getMyRooms,addProblemToRoom,deleteRoom,endRoomSession} from "../controllers/room.controller.js"  
import { verifyJWT } from "../middlewares/auth.middleware.js"  
import { restrictToInterviewer } from "../middlewares/role.middleware.js"  

const router = Router()  

router.use(verifyJWT)  

// must sit before /:id — Express would match "my-rooms" as an id otherwise
router.route("/my-rooms").get(getMyRooms)  

router.route("/").post(createRoom)  
router.route("/join/:inviteLink").post(joinRoom)  
router.route("/:id").get(getRoomById)  
router.route("/:roomId/add-problem").post( addProblemToRoom)
router.route("/:roomId").delete(deleteRoom)
router.route("/:roomId/end").put(restrictToInterviewer, endRoomSession)  

export default router  