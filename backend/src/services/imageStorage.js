import { v2 as cloudinary } from "cloudinary";

export function isImageStorageConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

const siteImageFolders = new Set(["brand", "favicon", "homepage"]);

export function isValidImageBuffer(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/gif") {
    const signature = buffer.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (mimeType === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  if (mimeType === "image/avif") {
    return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(buffer.toString("ascii", 8, 12));
  }
  return false;
}

function configureCloudinary() {
  if (!isImageStorageConfigured()) {
    const error = new Error("Cloudinary image storage is not configured.");
    error.status = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

function optimizedImageUrl(client, result) {
  return client.url(result.public_id, {
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    version: result.version,
  });
}

export function uploadServiceImage(buffer, filename) {
  const client = configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        folder: "superx/services",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Image storage returned an incomplete upload result."));
        }
        return resolve({ url: optimizedImageUrl(client, result), publicId: result.public_id });
      },
    );
    upload.end(buffer);
  });
}

export async function deleteServiceImage(publicId) {
  if (!publicId?.startsWith("superx/services/")) {
    throw new Error("Refusing to delete an image outside the service image folder.");
  }
  const client = configureCloudinary();
  const result = await client.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary did not delete ${publicId}: ${result.result}.`);
  }
}

export function uploadSiteImage(buffer, filename, folder) {
  if (!siteImageFolders.has(folder)) {
    throw new Error("Refusing to upload an image to an unsupported site folder.");
  }
  const client = configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        folder: `superx/site/${folder}`,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Image storage returned an incomplete upload result."));
        }
        return resolve({ url: optimizedImageUrl(client, result), publicId: result.public_id });
      },
    );
    upload.end(buffer);
  });
}

export function uploadProjectImage(buffer, filename) {
  const client = configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        folder: "superx/portfolio",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Image storage returned an incomplete upload result."));
        }
        return resolve({ url: optimizedImageUrl(client, result), publicId: result.public_id });
      },
    );
    upload.end(buffer);
  });
}

export function uploadAboutImage(buffer, filename) {
  const client = configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        folder: "superx/about",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Image storage returned an incomplete upload result."));
        }
        return resolve({ url: optimizedImageUrl(client, result), publicId: result.public_id });
      },
    );
    upload.end(buffer);
  });
}

export async function deleteSiteImage(publicId) {
  const folder = publicId?.split("/").slice(0, 3).join("/");
  if (!publicId?.startsWith("superx/site/") || !siteImageFolders.has(folder?.slice("superx/site/".length))) {
    throw new Error("Refusing to delete an image outside the site image folders.");
  }
  const client = configureCloudinary();
  const result = await client.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary did not delete ${publicId}: ${result.result}.`);
  }
}

export async function deleteProjectImage(publicId) {
  if (!publicId?.startsWith("superx/portfolio/")) {
    throw new Error("Refusing to delete an image outside the portfolio storage folder.");
  }
  const client = configureCloudinary();
  const result = await client.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary did not delete ${publicId}: ${result.result}.`);
  }
}

export async function deleteAboutImage(publicId) {
  if (!publicId?.startsWith("superx/about/")) {
    throw new Error("Refusing to delete an image outside the About image folder.");
  }
  const client = configureCloudinary();
  const result = await client.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary did not delete ${publicId}: ${result.result}.`);
  }
}
