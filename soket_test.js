import io from "socket.io-client";

const PORT = 3000;
const socket = io(`http://localhost:${PORT}`);

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("newBooking", (data) => {
    console.log("NEW BOOKING:", data);
});

socket.on("getBookings", (data) => {
    console.log("GET BOOKINGS:", data);
});

socket.on("updateBooking", (data) => {
    console.log("UPDATE BOOKING:", data);
});

socket.on("deleteBooking", (data) => {
    console.log("DELETE BOOKING:", data);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
});