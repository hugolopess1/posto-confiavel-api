const express = require('express');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'online' });
});

app.get('/stations', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Posto Teste',
      brand: 'BR',
      gasolinePrice: 5.89
    }
  ]);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});