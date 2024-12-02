import fs from 'fs'
import path from 'path'
import {createCanvas, loadImage} from 'canvas'

// Function to convert image to ImageData
export async function loadImageAsImageData(filePath) {
    const image = await loadImage(filePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Function to save ImageData back to a file
export async function saveImageDataToFile(imageData, filePath) {
    const canvas = createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
}

// Function to check if a file is an image based on its extension
export function isImageFile(fileName) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'];
    const ext = path.extname(fileName).toLowerCase();
    return validExtensions.includes(ext);
}

