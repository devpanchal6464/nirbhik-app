const express = require('express');
const multer = require('multer');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const PORT = 3000;

//  MongoDB connection setup
mongoose.connect('mongodb://127.0.0.1:27017/aadhaarDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Aadhaar QR Parsing Endpoint
app.post('/api/parse', (req, res) => {
  const xml = req.body.xml;
  console.log("Received XML:", xml);
  const parser = new xml2js.Parser({ explicitArray: false, attrkey: 'attr' });

  parser.parseString(xml, (err, result) => {
    if (err) {
      console.error("XML Parse Error:", err);
      return res.status(400).send({ error: 'Invalid XML' });
    }

    console.log("Parsed XML Result:", result); // 🐛 DEBUG

    const data = result?.PrintLetterBarcodeData?.attr;

    if (!data) {
      return res.status(400).send({ error: 'Invalid Aadhaar QR Format' });
    }

    res.send({
      name: data.name || 'N/A',
      gender: data.gender || 'N/A',
      dob: data.dob || data.yob || 'N/A',
      address: `${data.loc || ''}, ${data.dist || ''}, ${data.state || ''} - ${data.pc || ''}`
    });
  });
});


// Video upload
// const storage = multer.diskStorage({
//   destination: 'uploads/',
//   filename: (req, file, cb) => {
//     cb(null, `video-${Date.now()}.webm`);
//   }
// });
// const upload = multer({ storage });

    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    // ✅ Cloudinary configuration
    cloudinary.config({
      cloud_name: 'dvudrqw4v',
      api_key: '156374349868656',
      api_secret: 'Qlhqwt5IusWf5W5iXiqnmyB3kMk'
    });

    // ✅ Multer + Cloudinary storage
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'nirbhik-videos', // folder name in your Cloudinary account
        resource_type: 'video',
        format: 'webm',
        public_id: (req, file) => 'video-' + Date.now()
      }
    });

    const upload = multer({ storage });

  app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    const { name, gender, dob, address } = req.body;

    const newUser = new User({
      name,
      gender,
      dob,
      address,
      videoPath: req.file.path // this is now the Cloudinary video URL ✅
    });

    await newUser.save();
    console.log('✅ Saved to MongoDB:', newUser);

    res.send({ message: 'Video uploaded and user data saved ✅' });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).send({ error: 'Failed to upload and save data' });
  }
});

// app.post('/api/upload-video', upload.single('video'), async (req, res) => {
//   try {
//     const { name, gender, dob, address } = req.body;

//     const fileName = `video-${Date.now()}.webm`;
//     const targetPath = path.join(__dirname, 'uploads', fileName);

//     fs.rename(req.file.path, targetPath, async (err) => {
//       if (err) {
//         console.error('File move error:', err);
//         return res.sendStatus(500);
//       }

//       // Save to MongoDB
//       const newUser = new User({
//         name,
//         gender,
//         dob,
//         address,
//         videoPath: `/uploads/${fileName}`
//       });

//       await newUser.save();
//       console.log('✅ Saved to MongoDB:', newUser);

//       res.send({ message: 'Video uploaded and user data saved ✅' });
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ error: 'Failed to upload and save data' });
//   }
// });


// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
