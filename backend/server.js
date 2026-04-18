const express = require('express');
const cors = require('cors');
require('dotenv').config();

const plansRoutes = require('./routes/plans');
const subscriptionsRoutes = require('./routes/subscriptions');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/plans', plansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
