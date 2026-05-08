import { Router } from "express";
import { createRoom, getUserRooms, getRoomById } from "../controllers/room.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Global Security Checkpoint
router.use(verifyJWT);

// Resource: Collections
router.route("/").post(createRoom).get(getUserRooms);

// Resource: Specific Entity
router.route("/:roomId").get(getRoomById);

router.route("/join").post(joinRoom);
export default router;