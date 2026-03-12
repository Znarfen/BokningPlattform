import { Schema, model } from "mongoose";

const bookingSchema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
});

export default model("Booking", bookingSchema);