import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

// 🔥 FIXED: Import cloudinary properly and validate credentials
const createCloudinaryConfig = async () => {
  try {
    const { v2: cloudinary } = await import("cloudinary");

    // Get credentials from environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log("🔍 Cloudinary credentials check:");
    console.log("Cloud Name:", cloudName ? "✅ Found" : "❌ Missing");
    console.log("API Key:", apiKey ? "✅ Found" : "❌ Missing");
    console.log("API Secret:", apiSecret ? "✅ Found" : "❌ Missing");

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary credentials are missing. Please check your .env file."
      );
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    // Test the configuration
    try {
      await cloudinary.api.ping();
      console.log("✅ Cloudinary connection test successful");
    } catch (testError) {
      console.error("❌ Cloudinary connection test failed:", testError);
      throw new Error(`Cloudinary connection failed: ${testError.message}`);
    }

    console.log("✅ Cloudinary configured successfully");
    return cloudinary;
  } catch (error) {
    console.error("❌ Error configuring Cloudinary:", error);
    throw error;
  }
};

// Initialize cloudinary
let cloudinary;
try {
  cloudinary = await createCloudinaryConfig();
} catch (error) {
  console.error("❌ Failed to initialize Cloudinary:", error);
  // Don't throw here, let the route handle the error
}

// Configure Cloudinary storage for multer
const createStorage = () => {
  if (!cloudinary) {
    throw new Error("Cloudinary not properly configured");
  }

  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "quiro-ferreira/professionals", // Folder in Cloudinary
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "face",
          quality: "auto:good",
        },
      ],
    },
  });
};

// Create multer instance
const createUpload = () => {
  try {
    const storage = createStorage();

    return multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        console.log("🔄 File filter - File type:", file.mimetype);

        // Check file type
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new Error("Apenas arquivos de imagem são permitidos"), false);
        }
      },
    });
  } catch (error) {
    console.error("❌ Error creating upload middleware:", error);
    throw error;
  }
};

export default createUpload;
