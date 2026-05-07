const express = require('express');
const cors = require('cors');

const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'online' });
});


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'online'
  });
});

app.get('/stations', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Posto Shell Centro',
      brand: 'Shell',
      gasolinePrice: 5.89,
      ethanolPrice: 4.29,
      dieselPrice: 5.99,
      trustScore: 87,
      avgRating: 4.7,
      reviewCount: 128
    }
  ]);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});