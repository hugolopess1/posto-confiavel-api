const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'online' });
});

app.get('/stations', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Posto BR Asa Sul',
      brand: 'BR',
      gasolinePrice: 5.89,
      latitude: -15.7942,
      longitude: -47.8822
    },

    {
      id: 2,
      name: 'Posto Shell Centro',
      brand: 'Shell',
      gasolinePrice: 5.79,
      latitude: -15.8010,
      longitude: -47.8900
    },

    {
      id: 3,
      name: 'Posto Ipiranga',
      brand: 'Ipiranga',
      gasolinePrice: 5.95,
      latitude: -15.7990,
      longitude: -47.8780
    }
  ]);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});