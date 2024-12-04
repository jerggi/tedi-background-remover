import fs from 'fs'
import path from 'path'
import {loadImageAsImageData, saveImageDataToFile, isImageFile} from './src/image.js'
import removeBackground from './src/BackgroundRemover.js'

const DEFAULT_INPUT_FOLDER = './input'
const DEFAULT_OUTPUT_FOLDER = './output'

const INITIAL_REMOVE_BACKGROUND = {
    threshold: 25,
    blur: 1,
}

// Function to process all images in a folder
async function processImagesInFolder(inputFolder, outputFolder, performanceFile) {
    try {
        // Ensure the output folder exists
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        // Read all files in the input folder
        const files = fs.readdirSync(inputFolder);

        // Array to store performance data
        const performanceData = [];

        for (const file of files) {
            if (!isImageFile(file)) {
                continue;
            }

            const inputFilePath = path.join(inputFolder, file);
            const outputFilePath = path.join(outputFolder, file.replace(/\.[^/.]+$/, '.png')); // Ensure PNG extension

            try {
                console.log(`Processing ${file}...`);

                // Load image as ImageData
                const imageData = await loadImageAsImageData(inputFilePath);

                // Measure performance of removeBackground
                const startTime = Date.now();

                // Apply removeBlueFromImage
                const modifiedImageData = removeBackground({image: imageData, settings: INITIAL_REMOVE_BACKGROUND});

                const endTime = Date.now();

                // Save the modified image
                await saveImageDataToFile(modifiedImageData, outputFilePath);

                // Save performance data
                const timeTaken = endTime - startTime;
                performanceData.push({
                    name: file,
                    time: timeTaken,
                    width: imageData.width,
                    height: imageData.height,
                });

                console.log(`Saved processed image to ${outputFilePath}`);
            } catch (error) {
                console.error(`Error processing ${file}:`, error);
            }
        }

        // Write performance data to JSON file
        fs.writeFileSync(performanceFile, JSON.stringify(performanceData, null, 2));
        console.log(`Performance data saved to ${performanceFile}`);
    } catch (error) {
        console.error('Error reading input folder:', error);
    }
}

// Main function
async function main() {
    const inputFolder = process.argv[2] || DEFAULT_INPUT_FOLDER;  // Folder containing input images
    const outputFolder = process.argv[3] || DEFAULT_OUTPUT_FOLDER; // Folder to save processed images
    const performanceFile  = `${DEFAULT_OUTPUT_FOLDER}/performance-data.json`; // File to save performance data

    await processImagesInFolder(inputFolder, outputFolder, performanceFile);
    console.log('All images processed!');
}

// Run the script
main()
