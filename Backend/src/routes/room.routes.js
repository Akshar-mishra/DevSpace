import { Router } from "express";
import {createRoom,joinRoom,getRoomById,getMyRooms,} from "../controllers/room.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// must sit before /:id — Express would match "my-rooms" as an id otherwise
router.route("/my-rooms").get(getMyRooms);

router.route("/").post(createRoom);
router.route("/join/:inviteLink").post(joinRoom);
router.route("/:id").get(getRoomById);

export default router;