import express from "express";
import bcrypt from "bcrypt";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "./models/User.js";
import Room from "./models/Room.js";
import Booking from "./models/Booking.js";
import middleware, { authorizeRole, authentication } from "./middleware.js";

const { ObjectId } = mongoose.Types;

const PORT = process.env.PORT || 3000;
const app = express();
const JWT_SECRET = "super_secret_key";

middleware(app);

// debug route
app.get('/debug', (req, res) => {
	res.json({
		users: find().then(users => users.map(thisUser => ({ username: thisUser.username, role: thisUser.role }))),
		rooms: _find().then(rooms => rooms.map(thisRoom => thisRoom.name))
	});
});

// registration route
app.post('/register', async (req, res) => {
	try {
		const { username, password, role="user" } = req.body;

		if (!username || !password) {
			return res.status(400).json({ message: 'Username and password are required' });
		}

		if (!(role === "user" || role === "admin" || role === "moderator")) {
			return res.status(400).json({ message: 'Invalid role specified' });
		}

		const newUser = new User({
			username,
			password: await bcrypt.hash(password, 10),
			role
		});

		await newUser.save();

		console.log("User registered: '" + username + "' with role: '" + role + "'");
		res.status(201).json({ message: "User registered successfully" });

	} catch (error) {
		console.error("register error: " + error);
		res.status(500).json({ message: 'Error registering user' });
	}
});

// login route
app.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) return res.status(400).json({ message: "Username and password required" });

		const user = await User.findOne({ username });

		if (!user) return res.status(401).json({ message: "User not found!" });

		const valid = await bcrypt.compare(password, user.password);

		if (!valid) return res.status(401).json({ message: "Invalid credentials!" });

		const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

		if (!token) return res.status(500).json({ message: "Error generating token!" });

		res.json({ message: "Login successful!", token: token });
		console.log("User logged in: '" + username + "' with role: '" + user.role + "' and JWT token: " + token);
	} catch (err) {
		console.error("login error: " + err);
		res.status(500).json({ message: "Server error" });
	}
});

// Create room route
app.post('/addroom', authentication, authorizeRole(["create"]), async (req, res) => {
	try {
		const { name, capacity, type } = req.body;
		if (!name || !capacity || !type) return res.status(400).json({ message: "Name, capacity and type are required!" });

		if (capacity <= 1) return res.status(400).json({ message: "Capacity must be more than 0!" });

		const existingRoom = await Room.findOne({ name });
		if (existingRoom) return res.status(400).json({ message: "Room with this name already exists!" });

		const newRoom = new Room({ name, capacity, type });
		await newRoom.save();

		console.log("Room created: '" + name + "' with capacity: '" + capacity + "' and type: '" + type + "'");
		res.status(201).json({ message: "Room created successfully:" + newRoom});

	} catch (error) {
		console.error("rooms error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get all rooms route
app.get('/rooms', authentication, authorizeRole(["read"]), async (req, res) => {
	try {
		const rooms = await Room.find();
		res.json(rooms.map(room => ({ id: room._id, name: room.name, capacity: room.capacity, type: room.type })));
	} catch (error) {
		console.error("get rooms error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Update room route
app.put('/updateroom/:name', authentication, authorizeRole(["update"]), async (req, res) => {
	try {
		const { currentName } = req.params;
		const { capacity, type, name } = req.body;

		const room = await Room.findOne({ currentName });
		if (!room) return res.status(404).json({ message: "Room not found!" });

		const existingRoom = await Room.findOne({ name });
		if (existingRoom) return res.status(400).json({ message: "Another room with this name already exists!" });

		if (capacity) room.capacity = capacity;
		if (type) room.type = type;
		if (name) room.name = name;
		await room.save();
		await existingRoom.deleteOne();

		res.json({ message: "Room updated successfully!" });
		console.log("Room updated: '" + currentName + "' new values - name: '" + room.name + "', capacity: '" + room.capacity + "', type: '" + room.type + "'");
	} catch (error) {
		console.error("update room error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Delete room route
app.delete('/killroom/:name', authentication, authorizeRole(["remove"]), async (req, res) => {
	try {
		const { name } = req.params;

		const room = await Room.findOne({ name });
		if (!room) return res.status(404).json({ message: "Room not found!" });

		await room.deleteOne();

		res.json({ message: "Room deleted successfully!" });
		console.log("Room deleted: '" + name + "'");

	} catch (error) {
		console.error("delete room error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Booking rooms route
app.post('/booking', async (req, res) => {
	try {
		const {roomId, startTime, endTime } = req.body;

		const userId = req.user?.userId;
		if (!userId) return res.status(401).json({ message: "User not authenticated!" });

		// Validate roomId is a valid ObjectId
		if (!ObjectId.isValid(roomId)) {
			return res.status(400).json({ message: "Invalid room ID format" });
		}

		// Validate and sanitize date inputs
		const startDate = new Date(startTime);
		const endDate = new Date(endTime);

		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return res.status(400).json({ message: "Invalid date format for startTime or endTime" });
		}

		const room = await Room.findOne({ _id: new ObjectId(roomId) });
		if (!room) return res.status(404).json({ message: "Room not found!" });

		const user = await User.findOne({ _id: new ObjectId(userId) });
		if (!user) return res.status(404).json({ message: "User not found!" });

		// Check for overlapping bookings
		const overlappingBooking = await Booking.findOne({
			roomId: new ObjectId(roomId),
			startTime: { $lt: endDate },
			endTime: { $gt: startDate }
		});
		if (overlappingBooking) return res.status(400).json({ message: "Room is already booked for the selected time period!" });

		await new Booking({ roomId: new ObjectId(roomId), userId: new ObjectId(userId), startTime: startDate, endTime: endDate }).save();

		res.json({ message: "Room booked successfully!" });

	}
	catch (err) {
		console.error("book error: " + err);
		res.status(500).json({ message: "Server error" });
	}
});

async function startServer() {
	// Start in-memory MongoDB
	const mongod = await MongoMemoryServer.create();
	const uri = mongod.getUri();

	// Connect Mongoose
	await mongoose.connect(uri);
	console.log("Connected to in-memory MongoDB");

	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();