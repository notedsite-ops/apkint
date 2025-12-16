const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ApkReader = require('adbkit-apkreader');
const fs = require('fs');

const app = express();
// Save uploads temporarily
const upload = multer({ dest: 'uploads/' });

// Enable CORS so Neocities can talk to this server
app.use(cors());

// FIX: Instead of looking for index.html, just show a text message.
app.get('/', (req, res) => {
    res.send('APKint Backend is Running. Go to fishnerds.neocities.org/apkint to use it.');
});

// The API Endpoint
app.post('/api/interpret', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    try {
        const reader = await ApkReader.open(req.file.path);
        const manifest = await reader.readManifest();
        
        // Extract Info
        const label = manifest.application.label || "Unknown App";
        
        // Extract Icon
        let iconBase64 = null;
        if (manifest.application.icon) {
            try {
                const iconBuffer = await reader.readContent(manifest.application.icon);
                iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;
            } catch (e) { /* Icon error, ignore */ }
        }

        // Cleanup
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            appName: typeof label === 'string' ? label : manifest.package,
            icon: iconBase64
        });

    } catch (e) {
        if(req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to parse APK' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`APKint Server Ready on port ${PORT}`));
