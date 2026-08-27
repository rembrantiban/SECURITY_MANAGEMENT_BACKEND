"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const streamifier_1 = __importDefault(require("streamifier"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const uploadToCloudinary = (file, folder = "incidents") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({
            folder,
        }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result);
        });
        streamifier_1.default
            .createReadStream(file.buffer)
            .pipe(stream);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
