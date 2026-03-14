const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

exports.annotateImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image uploaded.');
  }

  const filePath = req.file.path;

  try {
    // 1. Call Azure AI Vision API (v4.0 supports up to 20MB)
    const detectionResults = await detectObjects(filePath);

    // 2. Draw bounding boxes (v4.0 returns data in objectsResult.values)
    const objects = detectionResults.objectsResult ? detectionResults.objectsResult.values : [];
    const annotatedImageBuffer = await drawBoundingBoxes(filePath, objects);

    // 3. Return annotated image
    res.set('Content-Type', 'image/jpeg');
    res.send(annotatedImageBuffer);

  } catch (error) {
    console.error('Error processing image:', error.response?.data || error.message);
    res.status(500).send('Error processing image.');
  } finally {
    // 4. Delete temporary files
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
  }
};

async function detectObjects(filePath) {
  let endpoint = process.env.AZURE_VISION_ENDPOINT;
  const key = process.env.AZURE_VISION_KEY;

  if (!endpoint || !key || key === 'xxxx') {
    throw new Error('Azure Vision API key or endpoint not configured.');
  }

  // Remove trailing slash and build v4.0 URL
  endpoint = endpoint.replace(/\/+$/, '');
  const url = `${endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=objects`;
  
  const imageData = fs.readFileSync(filePath);

  const response = await axios.post(url, imageData, {
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/octet-stream'
    }
  });

  return response.data;
}

async function drawBoundingBoxes(filePath, objects) {
  const image = await loadImage(filePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Set style for bounding boxes
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 4; // Increased for better visibility on large images
  ctx.font = '24px Arial';
  ctx.fillStyle = 'red';

  objects.forEach(obj => {
    // v4.0 structure: { boundingBox: { x, y, w, h }, tags: [{ name, confidence }] }
    const { x, y, w, h } = obj.boundingBox;
    const tag = obj.tags[0];
    const label = `${tag.name} ${(tag.confidence * 100).toFixed(0)}%`;

    // Draw rectangle
    ctx.strokeRect(x, y, w, h);

    // Draw label background
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(x, y - 30, textWidth + 10, 30);

    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(label, x + 5, y - 8);
    ctx.fillStyle = 'red'; // reset for next object
  });

  return canvas.toBuffer('image/jpeg');
}
