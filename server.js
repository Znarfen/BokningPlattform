import express from "express";
import bcrypt from "bcrypt";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";

import User from "./models/User.js";
import Room from "./models/Room.js";
import Booking from "./models/Booking.js";
import middleware, { authorizeRole, authentication, checkRole } from "./middleware.js";

const { ObjectId } = mongoose.Types;

const PORT = process.env.PORT || 3000;
const app = express();
const JWT_SECRET = "super_secret_key";

const server = http.createServer(app);
const io = new Server(server);

const debug = false; // Enabele or disable console logs (for debugging)

middleware(app);

function debugLog(message, forceMessage = false) {
	if (debug || forceMessage) console.log(message);
}

// Manage connections (with Socket.IO)
io.on('connection', (socket) => {
	socket.on('newBooking', (data) => console.log('New booking: ' + JSON.stringify(data)));
	socket.on('getBookings', (data) => console.log('Bookings logged: ' + JSON.stringify(data)));
	socket.on('updateBooking', (data) => console.log('Booking updated: ' + JSON.stringify(data)));
	socket.on('deleteBooking', (data) => console.log('Booking deleted: ' + JSON.stringify(data)));
});

// debug route
app.get('/debug', (req, res) => {
	if (!debug) return res.status(403).json({ message: "Debug mode is disabled!" });
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

		debugLog("User registered: '" + username + "' with role: '" + role + "'");
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
		debugLog("User logged in: '" + username + "' with role: '" + user.role + "' and JWT token: " + token);
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

		debugLog("Room created: '" + name + "' with capacity: '" + capacity + "' and type: '" + type + "'");
		res.status(201).json({ message: "Room created successfully!", room: newRoom, id: newRoom._id });

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
app.put('/updateroom/:id', authentication, authorizeRole(["update"]), async (req, res) => {
	try {
		const { id } = req.params;
		const { capacity, type, name } = req.body;

		const room = await Room.findOne({ _id: id });
		if (!room) return res.status(404).json({ message: "Room not found!" });
		const oldName = room.name;

		if (name !== room.name) {
			const existingRoom = await Room.findOne({ name });
			if (existingRoom) return res.status(400).json({ message: "Another room with this name already exists!" });
		}

		if (capacity) room.capacity = capacity;
		if (type) room.type = type;
		if (name) room.name = name;
		await room.save();

		res.json({ message: "Room updated successfully!" });
		debugLog("Room updated: '" + oldName + "' new values - name: '" + room.name + "', capacity: '" + room.capacity + "', type: '" + room.type + "'");
	} catch (error) {
		console.error("update room error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Delete room route
app.delete('/killroom/:id', authentication, authorizeRole(["remove"]), async (req, res) => {
	try {
		const { id } = req.params;

		const room = await Room.findOne({ _id: id });
		if (!room) return res.status(404).json({ message: "Room not found!" });

		await room.deleteOne();

		res.json({ message: "Room deleted successfully!" });
		debugLog("Room deleted: '" + room.name + "'");

	} catch (error) {
		console.error("delete room error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Create booking rooms route
app.post('/booking', authentication, async (req, res) => {
	try {
		const {roomId, startTime, endTime } = req.body;

		const userId = req.user?.userId;
		if (!userId) return res.status(401).json({ message: "User not authenticated!" });

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
			roomId: room._id,
			startTime: { $lt: endDate },
			endTime: { $gt: startDate }
		});
		if (overlappingBooking) return res.status(400).json({ message: "Room is unavailable for the selected time period." });

		const newBooking = new Booking({ roomId: new ObjectId(roomId), userId: new ObjectId(userId), startTime: startDate, endTime: endDate });
		await newBooking.save();

		io.emit('newBooking',{ room: room.name, user: user.username, startTime: startDate, endTime: endDate });

		res.json({ message: "Room booked successfully!", id: newBooking._id });
		debugLog("Room booked: '" + room.name + "' by user: '" + user.username + "' from: '" + startDate.toISOString() + "' to: '" + endDate.toISOString() + "'", "Booking ID: '" + newBooking._id + "'");

	}
	catch (err) {
		console.error("book error: " + err);
		res.status(500).json({ message: "Server error" });
	}
});

// Show all bookings that the user has made
app.get('/bookings', authentication, async (req, res) => {
	try {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).json({ message: "User not authenticated!" });

		let bookings = await Booking.find();

		// If user missing "read" perm. filter bookings.
		if(!checkRole("read")(req)){
			let newBooking = [];
			bookings.forEach(booking => {
				if (booking.userId == userId) newBooking.push(booking);
			});
			bookings = newBooking;
		}

		res.json(bookings.map(booking => ({
			id: booking._id,
			room: booking.roomId,
			user: booking.userId,
			startTime: booking.startTime,
			endTime: booking.endTime
		})));

		io.emit('getBookings', {user: req.user.username, role: req.user.role});

		debugLog("Bookings retrieved for user an user with role: '" + req.user.role + "'");
	} catch (error) {
		console.error("get bookings error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Update an booking
app.put('/updatebooking/:id', authentication, async (req, res) => {
	try {
		const { id } = req.params;
		const { startTime, endTime } = req.body;

		const booking = await Booking.findById(id);
		if (!booking) return res.status(404).json({ message: "Booking not found!" });

		// Check if the user has permission to update the booking
        const isOwner = booking.userId == req.user.id;
        const isAdmin = checkRole("remove")(req);
        if (!(isAdmin || isOwner)) return res.status(403).json({ message: "Forbidden: You don't have the required permissions!" });

		const startDate = new Date(startTime);
		const endDate = new Date(endTime);

		// Check for overlapping bookings
		const overlappingBooking = await Booking.findOne({
			_id: { $ne: new ObjectId(id) },
			roomId: booking.roomId,
			startTime: { $lt: endDate },
			endTime: { $gt: startDate }
		});
		if (overlappingBooking) return res.status(400).json({ message: "Room is unavailable for the selected time period." });

		booking.startTime = startDate;
		booking.endTime = endDate;
		await booking.save();

		res.json({ message: "Booking updated successfully!" });
		io.emit('updateBooking', { bookingId: booking._id, user: req.user.username, role: req.user.role });
		debugLog("Booking updated: '" + booking._id + "' new values - startTime: '" + startDate + "', endTime: '" + endDate + "'");

	} catch (error) {
		console.error("update booking error: " + error);
		res.status(500).json({ message: "Server error" });
	}
});

// Delete a booking
app.delete('/deletebooking/:id', authentication, async (req, res) => {
	try {
		const { id } = req.params;

		const booking = await Booking.findById(id);
		if (!booking) return res.status(404).json({ message: "Booking not found!" });

        const isOwner = booking.userId == req.user.id;
        const isAdmin = checkRole("remove")(req);
        if (!(isAdmin || isOwner)) return res.status(403).json({ message: "Forbidden: You don't have the required permissions!" });

		await booking.deleteOne();

		res.json({ message: "Booking deleted successfully!" });
		io.emit('deleteBooking', { bookingId: booking._id, user: req.user.username, role: req.user.role });
		debugLog("Booking deleted: '" + booking._id + "'");

	} catch (error) {
		console.error("delete booking error: " + error);
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
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startServer();