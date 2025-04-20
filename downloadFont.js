const https = require('https');
const fs = require('fs');
const path = require('path');

const fontUrl = 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf';
const fontPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');

https.get(fontUrl, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
            const fileStream = fs.createWriteStream(fontPath);
            redirectResponse.pipe(fileStream);
            fileStream.on('finish', () => {
                console.log('Roboto Bold font downloaded successfully!');
                fileStream.close();
            });
        });
    } else {
        const fileStream = fs.createWriteStream(fontPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            console.log('Roboto Bold font downloaded successfully!');
            fileStream.close();
        });
    }
}).on('error', (err) => {
    console.error('Error downloading font:', err.message);
}); 