import multer from 'multer';
import path from 'path'; // Add this import

const storage = multer.memoryStorage(); // Use memory storage

export const upload = multer({
    storage,
    limits: {
        fileSize: 3 * 1024 * 1024, // Limit file size to 3MB
    },
    fileFilter: (req, file, cb) => {
        // Accept only certain file types
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
});
