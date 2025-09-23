const { Canvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Register the font
const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'BebasNeue-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'Bebas Neue');

// Function to wrap text
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

async function createShopCanvas(items, page = 1, itemsPerPage = 9) {
    const startIndex = (page - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);
    const totalItems = pageItems.length;

    // Determine which background to use based on total items
    let backgroundFile;
    if (totalItems <= 3) {
        backgroundFile = 'shop_bg_3.png';
    } else if (totalItems <= 6) {
        backgroundFile = 'shop_bg_6.png';
    } else {
        backgroundFile = 'shop_bg_9.png';
    }

    // Load background image
    const background = await loadImage(path.join(__dirname, '..', 'assets', 'shop', backgroundFile));
    
    // Create canvas with background dimensions
    const canvas = new Canvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    
    // Enable text anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw background
    ctx.drawImage(background, 0, 0);

    // Add shadow to text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Box dimensions and spacing
    const boxWidth = 400; // Approximate width of each box
    const boxHeight = 200; // Approximate height of each box
    const nameMaxWidth = boxWidth - 40; // Leave some padding

    // Fixed positions for all 9 items based on the image
    const positions = [
        // First row (at the top)
        { x: 250, y: 550 },           // Left box
        { x: canvas.width/2, y: 550 }, // Middle box
        { x: canvas.width - 250, y: 550 },  // Right box
        // Second row (middle boxes)
        { x: 250, y: 950 },           // Left box
        { x: canvas.width/2, y: 950 }, // Middle box
        { x: canvas.width - 250, y: 950 },  // Right box
        // Third row (bottom boxes)
        { x: 250, y: 1350 },           // Left box
        { x: canvas.width/2, y: 700 }, // Middle box
        { x: canvas.width - 250, y: 700 }   // Right box
    ];

    // Draw items
    for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        const position = positions[i];
        
        // Set text alignment based on position
        ctx.textAlign = i % 3 === 1 ? 'center' : (i % 3 === 0 ? 'left' : 'right');
        
        // Draw item name with custom color and text wrapping
        ctx.fillStyle = item.color || '#FFFFFF';
        ctx.font = 'bold 60px "Bebas Neue"';
        
        // Handle text wrapping for item name
        const nameLines = wrapText(ctx, item.name, nameMaxWidth);
        const lineHeight = 65;
        const totalHeight = nameLines.length * lineHeight;
        
        // Calculate starting Y position to center text vertically in box
        let currentY = position.y - (totalHeight / 2) + (lineHeight / 2);
        
        // Draw each line of the name
        nameLines.forEach(line => {
            ctx.fillText(line, position.x, currentY);
            currentY += lineHeight;
        });
        
        // Draw price below the last line of the name
        ctx.font = 'normal 45px "Bebas Neue"';
        ctx.fillText(`${item.price} COINS`, position.x, currentY + 10);
    }

    // If there are more items than can fit on one page, draw navigation hint
    if (items.length > itemsPerPage) {
        ctx.font = 'normal 20px "Bebas Neue"';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${page} of ${Math.ceil(items.length / itemsPerPage)}`, canvas.width/2, canvas.height - 30);
    }

    return canvas;
}

module.exports = { createShopCanvas }; 