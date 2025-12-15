const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ApkReader = require('adbkit-apkreader');
const fs = require('fs');
const path = require('path');

const app = express();
// Save uploads temporarily to a folder named 'uploads'
const upload = multer({ dest: 'uploads/' });

app.use(cors());

// 1. Serve the HTML file when someone visits the site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Serve the default APK image if requested
app.get('/apk.png', (req, res) => {
    // If you don't have a real apk.png file, this sends a 404, 
    // but the app will still work.
    res.status(404).send('Not found');
});

// 3. The API Endpoint: Interpret and "Rough Run"
app.post('/api/interpret', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    try {
        const reader = await ApkReader.open(req.file.path);
        const manifest = await reader.readManifest();
        
        // Extract Label (Name) and Package ID
        const label = manifest.application.label || "Unknown App";
        const pkg = manifest.package;
        
        // Extract Icon
        let iconBase64 = null;
        if (manifest.application.icon) {
            try {
                const iconBuffer = await reader.readContent(manifest.application.icon);
                iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;
            } catch (e) { /* Icon error, ignore */ }
        }

        // Cleanup: Delete the uploaded file to save space
        fs.unlinkSync(req.file.path);

        // Send back the data (The "Boot" result)
        res.json({
            success: true,
            appName: typeof label === 'string' ? label : pkg,
            icon: iconBase64
        });

    } catch (e) {
        // Cleanup on error
        if(req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to boot APK' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`APKint is ready.`));
