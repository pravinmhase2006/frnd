require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    name: 'FRND Backend',
    status: 'running',
    version: '1.0.0',
  });
});

app.use('/api', userRoutes);

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`FRND backend running on http://localhost:${PORT}`);
  });
};

startServer();
