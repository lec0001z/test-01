const express = require('express');
const multer = require('multer');
const path = require('path');
const ImageKit = require('imagekit');

const app = express();
const PORT = process.env.PORT || 3000;

const imagekit = new ImageKit({
  publicKey: (process.env.IMAGEKIT_PUBLIC_KEY || 'public_jeDHA4B+pfqViamnT3znN7jrBpk=').trim(),
  privateKey: (process.env.IMAGEKIT_PRIVATE_KEY || 'private_skM2MxlEmG2wuByfCVEMymQpg6k=').trim(),
  urlEndpoint: (process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/your_imagekit_id').trim(),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/imagekit-auth', (_req, res) => {
  try {
    const auth = imagekit.getAuthenticationParameters();
    res.json({
      success: true,
      data: {
        ...auth,
        publicKey: imagekit.options.publicKey,
        urlEndpoint: imagekit.options.urlEndpoint,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ success: false, message: multerErr.message });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '파일이 없습니다.' });
      }
      const result = await imagekit.upload({
        file: req.file.buffer,
        fileName: req.file.originalname,
        folder: '/uploads',
        useUniqueFileName: true,
      });
      res.json({
        success: true,
        data: {
          url: result.url,
          name: result.name,
          fileId: result.fileId,
          size: result.size,
          width: result.width,
          height: result.height,
          thumbnailUrl: result.thumbnailUrl,
          filePath: result.filePath,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err?.message || 'ImageKit 업로드 실패',
      });
    }
  });
});

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
