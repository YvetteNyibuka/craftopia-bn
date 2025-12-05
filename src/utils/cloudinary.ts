import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Upload a single image to Cloudinary
 * @param buffer - Image buffer
 * @param folder - Cloudinary folder to upload to
 * @param filename - Optional filename
 * @returns Promise<CloudinaryUploadResult>
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = 'craftopia/decors',
  filename?: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto',
      width: 1200,
      height: 1200,
      crop: 'limit',
    };

    if (filename) {
      uploadOptions.public_id = `${folder}/${filename}`;
      uploadOptions.overwrite = true;
    }

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Image upload failed: ${error.message}`));
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
          });
        } else {
          reject(new Error('Unknown upload error'));
        }
      }
    ).end(buffer);
  });
};

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of multer files
 * @param folder - Cloudinary folder to upload to
 * @returns Promise<CloudinaryUploadResult[]>
 */
export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[],
  folder: string = 'craftopia/decors'
): Promise<CloudinaryUploadResult[]> => {
  const uploadPromises = files.map((file, index) => {
    const filename = `${Date.now()}_${index}_${file.originalname.split('.')[0]}`;
    return uploadToCloudinary(file.buffer, folder, filename);
  });

  return Promise.all(uploadPromises);
};

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 * @returns Promise<boolean>
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of public IDs to delete
 * @returns Promise<boolean>
 */
export const deleteMultipleFromCloudinary = async (
  publicIds: string[]
): Promise<boolean> => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return Object.values(result.deleted).every((status) => status === 'deleted');
  } catch (error) {
    console.error('Cloudinary batch delete error:', error);
    return false;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns string - Public ID
 */
export const extractPublicIdFromUrl = (url: string): string => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const publicId = filename.split('.')[0];
  
  // Find the folder part (after upload/)
  const uploadIndex = parts.findIndex(part => part === 'upload');
  if (uploadIndex !== -1 && uploadIndex < parts.length - 2) {
    const folderParts = parts.slice(uploadIndex + 2, -1);
    return folderParts.length > 0 ? `${folderParts.join('/')}/${publicId}` : publicId;
  }
  
  return publicId;
};
