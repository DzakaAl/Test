const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, "../uploads/profiles"),
  path.join(__dirname, "../uploads/bukti_pembayaran"),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;

    // Determine upload path based on field name
    if (file.fieldname === "profilePicture") {
      uploadPath = path.join(__dirname, "../uploads/profiles");
    } else if (file.fieldname === "buktiPembayaran") {
      uploadPath = path.join(__dirname, "../uploads/bukti_pembayaran");
    } else {
      uploadPath = path.join(__dirname, "../uploads");
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + random number + original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);

    let prefix;
    if (file.fieldname === "profilePicture") {
      prefix = "profile";
    } else if (file.fieldname === "buktiPembayaran") {
      prefix = "bukti";
    } else {
      prefix = "file";
    }

    cb(null, prefix + "-" + uniqueSuffix + extension);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for single file upload
const uploadProfilePicture = upload.single("profilePicture");
const uploadBuktiPembayaran = upload.single("buktiPembayaran");

// Wrapper middleware to handle multer errors
const handleUpload = (req, res, next) => {
  uploadProfilePicture(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 5MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "File upload error: " + err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// Wrapper middleware for payment proof upload
const handlePaymentProofUpload = (req, res, next) => {
  uploadBuktiPembayaran(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 5MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "File upload error: " + err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

module.exports = {
  upload, // Export the multer instance
  handleUpload, // For profile picture uploads
  uploadPaymentProof: handlePaymentProofUpload, // For payment proof uploads
  uploadDir: path.join(__dirname, "../uploads"),
};
