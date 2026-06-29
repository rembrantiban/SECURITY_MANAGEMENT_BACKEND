import streamifier from "streamifier";
import cloudinary from "../config/cloudinary";

export const uploadToCloudinary = (
    file: Express.Multer.File,
    folder = "incidents"
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
            },
            (error, result) => {
                if (error) return reject(error);

                resolve(result);
            }
        );

        streamifier
            .createReadStream(file.buffer)
            .pipe(stream);
    });
};