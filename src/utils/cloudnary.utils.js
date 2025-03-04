import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = (fileBuffer, fileName) => {
    console.log("Starting upload to Cloudinary...");

    return new Promise((resolve, reject) => {
        if (!fileBuffer) {
            console.error("No file buffer provided");
            return resolve(null);
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
                public_id: fileName, // Optional: You can add a unique ID if needed
            },
            (error, result) => {
                if (error) {
                    console.error("Error during upload to Cloudinary:", error);
                    return reject(error); // Reject the promise if there's an error
                }
                console.log("Upload result:", result);
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format
                });
            }
        );

        stream.end(fileBuffer); // End the stream with the file buffer
    });
};



const deleteFromCloudinary = async (publicId) => {
    try {
        const deleteResult = await cloudinary.uploader.destroy(publicId);
        if (deleteResult.result !== 'ok') {
            throw new Error(`Failed to delete avatar: ${deleteResult.result}`);
        }
        return deleteResult;
    } catch (error) {
        console.error(`Error deleting from Cloudinary: ${error.message}`);
        return null;
    }
};


export { uploadOnCloudinary, deleteFromCloudinary };
