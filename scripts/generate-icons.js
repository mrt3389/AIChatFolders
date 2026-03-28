/**
 * Generate beautiful PNG icons for the extension.
 * Creates modern folder with chat bubble icons at required sizes.
 *
 * Usage: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICONS_DIR = path.resolve(__dirname, '..', 'assets', 'icons');

/**
 * Create a beautiful PNG icon with gradient and modern design.
 */
function createIcon(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk - use RGBA for transparency
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(6, 9);        // color type (RGBA)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace

  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk - create image data with beautiful icon
  const rawData = [];
  const centerX = size / 2;
  const centerY = size / 2;
  const scale = size / 128;

  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < size; x++) {
      // Calculate pixel color
      const pixel = getPixelColor(x, y, size, scale);
      rawData.push(pixel.r, pixel.g, pixel.b, pixel.a);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Get pixel color for a modern icon design.
 * Design: Rounded folder with chat bubbles inside
 */
function getPixelColor(x, y, size, scale) {
  const pad = 8 * scale;
  const r = 12 * scale; // corner radius
  
  // Icon bounds
  const iconLeft = pad;
  const iconTop = pad + 10 * scale;
  const iconRight = size - pad;
  const iconBottom = size - pad;
  const iconWidth = iconRight - iconLeft;
  const iconHeight = iconBottom - iconTop;

  // Check if inside rounded rectangle (folder body)
  const inBody = isInsideRoundedRect(x, y, iconLeft, iconTop, iconWidth, iconHeight * 0.75, r);
  
  // Folder tab (top left)
  const tabWidth = iconWidth * 0.4;
  const tabHeight = iconHeight * 0.18;
  const tabY = iconTop - tabHeight + 2 * scale;
  const inTab = isInsideRoundedRect(x, y, iconLeft, tabY, tabWidth, tabHeight + 4 * scale, r);

  // Main folder shape
  const inFolder = inBody || inTab;

  // Chat bubble 1 (left, smaller)
  const bubble1X = iconLeft + iconWidth * 0.28;
  const bubble1Y = iconTop + iconHeight * 0.35;
  const bubble1R = iconWidth * 0.12;
  const inBubble1 = isInsideCircle(x, y, bubble1X, bubble1Y, bubble1R);

  // Chat bubble 2 (right, larger)
  const bubble2X = iconLeft + iconWidth * 0.65;
  const bubble2Y = iconTop + iconHeight * 0.45;
  const bubble2R = iconWidth * 0.18;
  const inBubble2 = isInsideCircle(x, y, bubble2X, bubble2Y, bubble2R);

  // Chat bubble tails
  const inTail1 = isInsideTriangle(x, y, 
    bubble1X - bubble1R * 0.3, bubble1Y + bubble1R * 0.7,
    bubble1X - bubble1R * 0.8, bubble1Y + bubble1R * 1.5,
    bubble1X + bubble1R * 0.2, bubble1Y + bubble1R * 0.7
  );
  
  const inTail2 = isInsideTriangle(x, y,
    bubble2X + bubble2R * 0.3, bubble2Y + bubble2R * 0.7,
    bubble2X + bubble2R * 0.9, bubble2Y + bubble2R * 1.6,
    bubble2X - bubble2R * 0.2, bubble2Y + bubble2R * 0.7
  );

  // Color definitions with gradient effect
  if (inFolder) {
    // Gradient blue for folder
    const gradY = (y - iconTop) / iconHeight;
    const baseR = 59 + gradY * 30;  // 59 -> 89
    const baseG = 130 + gradY * 20; // 130 -> 150
    const baseB = 246 - gradY * 30; // 246 -> 216
    
    // Add subtle border
    const border = 3 * scale;
    const isBorder = !isInsideRoundedRect(x, y, iconLeft + border, iconTop + border, 
      iconWidth - 2*border, iconHeight * 0.75 - 2*border, r - border);
    
    if (isBorder || (inTab && !isInsideRoundedRect(x, y, iconLeft + border, tabY + border, 
      tabWidth - 2*border, tabHeight + 4*scale - 2*border, r - border))) {
      // Darker border
      return { r: 37, g: 99, b: 235, a: 255 };
    }
    
    // Inside folder but check for bubble cutouts
    if (inBubble1 || inBubble2 || inTail1 || inTail2) {
      // White/light blue bubbles inside folder
      let dist;
      if (inBubble1) {
        dist = Math.sqrt((x - bubble1X)*(x - bubble1X) + (y - bubble1Y)*(y - bubble1Y)) / bubble1R;
      } else {
        dist = Math.sqrt((x - bubble2X)*(x - bubble2X) + (y - bubble2Y)*(y - bubble2Y)) / bubble2R;
      }
      const fade = Math.max(0, 1 - dist * 0.3);
      return { 
        r: Math.round(255 - fade * 40), 
        g: Math.round(255 - fade * 50), 
        b: Math.round(255 - fade * 60), 
        a: 255 
      };
    }
    
    return { r: Math.round(baseR), g: Math.round(baseG), b: Math.round(baseB), a: 255 };
  }

  // Outside folder - transparent
  return { r: 0, g: 0, b: 0, a: 0 };
}

/**
 * Check if point is inside a rounded rectangle.
 */
function isInsideRoundedRect(x, y, rx, ry, rw, rh, r) {
  // Check main rectangle
  if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
  
  // Check corners
  const inRect = x >= rx + r && x < rx + rw - r && y >= ry && y < ry + rh;
  if (inRect) return true;
  
  // Top-left corner
  if (x < rx + r && y < ry + r) {
    return Math.sqrt((x - (rx + r))**2 + (y - (ry + r))**2) <= r;
  }
  // Top-right corner
  if (x >= rx + rw - r && y < ry + r) {
    return Math.sqrt((x - (rx + rw - r))**2 + (y - (ry + r))**2) <= r;
  }
  // Bottom-left corner
  if (x < rx + r && y >= ry + rh - r) {
    return Math.sqrt((x - (rx + r))**2 + (y - (ry + rh - r))**2) <= r;
  }
  // Bottom-right corner
  if (x >= rx + rw - r && y >= ry + rh - r) {
    return Math.sqrt((x - (rx + rw - r))**2 + (y - (ry + rh - r))**2) <= r;
  }
  
  return true;
}

/**
 * Check if point is inside a circle.
 */
function isInsideCircle(x, y, cx, cy, r) {
  return Math.sqrt((x - cx)**2 + (y - cy)**2) <= r;
}

/**
 * Check if point is inside a triangle.
 */
function isInsideTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);

  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

  return !(hasNeg && hasPos);
}

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = createIcon(size);
  const filePath = path.join(ICONS_DIR, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated: icon-${size}.png (${png.length} bytes)`);
}

console.log('\nIcons generated successfully!');
