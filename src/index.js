import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app}  from "./app.js";

// Load environment variables from .env file
dotenv.config({
    path: "./env"
});

// Connect to the database
connectDB()
    .then(() => {
        // Handle server errors
        app.on("error", (err) => {
            console.log("Server Error:", err);
            process.exit(1);
        });

        // Start the server
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️  Server is running on port ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection failed:", err);
    });
