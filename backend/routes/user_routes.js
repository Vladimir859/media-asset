const Router = require("express")
const router = new Router()
const authController = require("../controllers/auth_controller")
const { requireAuth, requireRole } = require("../middleware/auth")
const {logAction} = require("../logs")
const logController = require("../controllers/log_controller.js");
const db = require("../db");


// добавь сразу после:
router.post("/auth/login",  authController.login)
router.post("/auth/logout", authController.logout)
router.get("/auth/me",      requireAuth, authController.me)

router.get("/logs", requireAuth, requireRole("admin"), logController.getLogs);

const userController = require("../controllers/user_controller")
const equipController = require("../controllers/equipment_controller")
const eventController = require("../controllers/event_controller")
const locationController = require("../controllers/location_controller")

router.post("/user", requireAuth, requireRole("admin"), userController.createUser)
router.get("/user", requireAuth, userController.getUsers)
router.get("/user/:id", requireAuth, userController.getOneUser)
router.put("/user", requireAuth, requireRole("admin"), userController.updateUser)
router.delete("/user/:id", requireAuth, requireRole("admin"), userController.deleteUser)

router.get('/role', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM role ORDER BY role_id');
    res.json(result.rows);
  });


router.get("/equipment/available", equipController.getAvaibleEquip);

router.post("/equipment", requireAuth, equipController.createEquip)
router.get("/equipment", requireAuth, equipController.getEquip)
router.get("/equipment/:id", requireAuth, equipController.getOneEquip)
router.put("/equipment", requireAuth, equipController.updateEquip)
router.delete("/equipment/:id", requireAuth, equipController.deleteEquip)



// ─── LOCATIONS ────────────────────────────────────────────────────────────
router.get("/location",        locationController.getLocations)
router.get("/location/:id",    locationController.getOneLocation)
router.post("/location",       locationController.createLocation)
router.put("/location",        locationController.updateLocation)
router.delete("/location/:id", locationController.deleteLocation)


router.get("/event",        requireAuth,            eventController.getEvents);
router.get("/event/:id",requireAuth,eventController.getOneEvent);
router.post("/event", requireAuth, eventController.createEvent);
router.put("/event", requireAuth, eventController.updateEvent);
router.delete("/event/:id", requireAuth, eventController.deleteEvent);
router.patch("/event/:id/finish",requireAuth,eventController.finishEvent);



module.exports = router