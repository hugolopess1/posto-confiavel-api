// Backend do Posto Confiável
// Stack: Node.js + Express + Prisma + SQLite
// Objetivo: API para usuários, postos, veículos, avaliações, abastecimentos e alertas.

// =====================================================
// 1) CRIAR O PROJETO
// =====================================================
// mkdir posto-confiavel-backend
// cd posto-confiavel-backend
// npm init -y
// npm install express cors dotenv @prisma/client
// npm install -D prisma nodemon
// npx prisma init --datasource-provider sqlite

// =====================================================
// 2) package.json
// =====================================================
// Troque/adapte a parte de scripts para:

/*
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "prisma": "prisma"
  }
}
*/

// =====================================================
// 3) .env
// =====================================================

/*
DATABASE_URL="file:./dev.db"
PORT=3333
*/

// =====================================================
// 4) prisma/schema.prisma
// =====================================================

/*
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  googleId    String   @unique
  name        String
  email       String   @unique
  photoUrl    String?
  points      Int      @default(0)
  level       Int      @default(1)
  createdAt   DateTime @default(now())
  vehicles    Vehicle[]
  reviews     Review[]
  fuelRecords FuelRecord[]
}

model Station {
  id            String   @id @default(cuid())
  name          String
  brand         String?
  latitude      Float
  longitude     Float
  address       String?
  city          String?
  state         String?
  trustScore    Int      @default(50)
  avgRating     Float    @default(0)
  reviewCount   Int      @default(0)
  gasolinePrice Float?
  ethanolPrice  Float?
  dieselPrice   Float?
  hasComplaint  Boolean  @default(false)
  createdAt     DateTime @default(now())
  reviews       Review[]
  fuelRecords   FuelRecord[]
}

model Vehicle {
  id             String   @id @default(cuid())
  userId         String
  brand          String
  model          String
  year           Int
  version        String?
  fuelType       String
  tankCapacity   Float?
  expectedCity   Float?
  expectedRoad   Float?
  currentAvgKmL  Float?
  isMain         Boolean  @default(false)
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
  fuelRecords    FuelRecord[]
}

model Review {
  id          String   @id @default(cuid())
  userId      String
  stationId   String
  rating      Int
  fuelQuality Int
  service     Int?
  price       Int?
  comment     String?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  station     Station  @relation(fields: [stationId], references: [id])

  @@unique([userId, stationId])
}

model FuelRecord {
  id              String   @id @default(cuid())
  userId          String
  vehicleId       String
  stationId       String
  fuelType        String
  odometerKm      Float
  liters          Float
  pricePerLiter   Float
  totalPrice      Float
  distanceKm      Float?
  kmPerLiter      Float?
  suspicious      Boolean  @default(false)
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id])
  station         Station  @relation(fields: [stationId], references: [id])
}
*/

// Depois rode:
// npx prisma migrate dev --name init

// =====================================================
// 5) src/server.js
// =====================================================


const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());


function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTrustScore(avgRating, reviewCount, suspiciousCount, complaint) {
  let score = 50;
  score += avgRating * 8;
  score += Math.min(reviewCount, 100) * 0.15;
  score -= suspiciousCount * 8;
  if (complaint) score -= 20;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function refreshStationScore(stationId) {
  const reviews = await prisma.review.findMany({ where: { stationId } });
  const fuelRecords = await prisma.fuelRecord.findMany({ where: { stationId } });
  const station = await prisma.Station.findUnique({ where: { id: stationId } });

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const suspiciousCount = fuelRecords.filter((r) => r.suspicious).length;
  const trustScore = calculateTrustScore(
    avgRating,
    reviews.length,
    suspiciousCount,
    station?.hasComplaint || false
  );

  return prisma.station.update({
    where: { id: stationId },
    data: {
      avgRating,
      reviewCount: reviews.length,
      trustScore,
    },
  });
}

app.get('/', async (req, res) => {
  const station = await prisma.station.create({
    data: {
      name: 'Posto Shell Centro',
      brand: 'Shell',
      latitude: -15.958,
      longitude: -48.27,
      city: 'Brasília',
      state: 'DF',
      gasolinePrice: 5.89,
      ethanolPrice: 4.29,
      trustScore: 87
    }
  });

  res.json(station);
});
// =====================================================
// USUÁRIOS / LOGIN GOOGLE MOCK
// No app real, depois validamos o token do Google/Firebase.
// =====================================================

app.post('/users/google', async (req, res) => {
  try {
    const { googleId, name, email, photoUrl } = req.body;

    if (!googleId || !name || !email) {
      return res.status(400).json({ error: 'googleId, name e email são obrigatórios.' });
    }

    const user = await prisma.user.upsert({
      where: { googleId },
      update: { name, email, photoUrl },
      create: { googleId, name, email, photoUrl },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar/login usuário.' });
  }
});

app.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { vehicles: true },
  });

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(user);
});

// =====================================================
// POSTOS
// =====================================================

app.post('/stations', async (req, res) => {
  try {
    const station = await prisma.station.create({ data: req.body });
    res.status(201).json(station);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao criar posto.' });
  }
});

app.get('/stations', async (req, res) => {
  const { lat, lng, radiusKm = 10 } = req.query;

  const stations = await prisma.station.findMany({
    orderBy: { trustScore: 'desc' },
  });

  if (!lat || !lng) return res.json(stations);

  const userLat = Number(lat);
  const userLng = Number(lng);
  const maxRadius = Number(radiusKm);

  const nearby = stations
    .map((station) => {
      const distanceKm = calculateDistanceKm(
        userLat,
        userLng,
        station.latitude,
        station.longitude
      );
      return { ...station, distanceKm: Number(distanceKm.toFixed(2)) };
    })
    .filter((station) => station.distanceKm <= maxRadius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json([
  {
    id: 1,
    name: "Posto Shell Centro",
    gasolinePrice: 5.89,
    ethanolPrice: 4.29,
    trustScore: 87
  }
]);
});

app.get('/stations/:id', async (req, res) => {
  const station = await prisma.station.findUnique({
    where: { id: req.params.id },
    include: {
      reviews: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      fuelRecords: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!station) return res.status(404).json({ error: 'Posto não encontrado.' });
  res.json(station);
});

// =====================================================
// VEÍCULOS
// =====================================================

app.post('/vehicles', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.create({ data: req.body });
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao cadastrar veículo.' });
  }
});

app.get('/users/:userId/vehicles', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(vehicles);
});

// =====================================================
// AVALIAÇÕES
// 1 usuário = 1 avaliação por posto. Se avaliar de novo, atualiza.
// =====================================================

app.post('/reviews', async (req, res) => {
  try {
    const { userId, stationId, rating, fuelQuality, service, price, comment } = req.body;

    if (!userId || !stationId || !rating || !fuelQuality) {
      return res.status(400).json({ error: 'userId, stationId, rating e fuelQuality são obrigatórios.' });
    }

    const review = await prisma.review.upsert({
      where: { userId_stationId: { userId, stationId } },
      update: { rating, fuelQuality, service, price, comment },
      create: { userId, stationId, rating, fuelQuality, service, price, comment },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: 10 } },
    });

    await refreshStationScore(stationId);

    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao salvar avaliação.' });
  }
});

// =====================================================
// ABASTECIMENTOS + CÁLCULO KM/L
// Regra:
// - odometerKm atual - odometerKm anterior = distância rodada
// - distância / litros = km/L
// - se cair mais de 25% da média do veículo, marca como suspeito
// =====================================================

app.post('/fuel-records', async (req, res) => {
  try {
    const {
      userId,
      vehicleId,
      stationId,
      fuelType,
      odometerKm,
      liters,
      pricePerLiter,
    } = req.body;

    if (!userId || !vehicleId || !stationId || !fuelType || !odometerKm || !liters || !pricePerLiter) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
    }

    const previous = await prisma.fuelRecord.findFirst({
      where: { vehicleId },
      orderBy: { odometerKm: 'desc' },
    });

    let distanceKm = null;
    let kmPerLiter = null;
    let suspicious = false;

    if (previous && Number(odometerKm) > previous.odometerKm) {
      distanceKm = Number(odometerKm) - previous.odometerKm;
      kmPerLiter = distanceKm / Number(liters);

      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      const referenceAvg = vehicle?.currentAvgKmL || vehicle?.expectedCity || vehicle?.expectedRoad;

      if (referenceAvg && kmPerLiter < referenceAvg * 0.75) {
        suspicious = true;
      }
    }

    const totalPrice = Number(liters) * Number(pricePerLiter);

    const record = await prisma.fuelRecord.create({
      data: {
        userId,
        vehicleId,
        stationId,
        fuelType,
        odometerKm: Number(odometerKm),
        liters: Number(liters),
        pricePerLiter: Number(pricePerLiter),
        totalPrice,
        distanceKm,
        kmPerLiter,
        suspicious,
      },
    });

    const allKmRecords = await prisma.fuelRecord.findMany({
      where: {
        vehicleId,
        kmPerLiter: { not: null },
      },
    });

    if (allKmRecords.length) {
      const avg = allKmRecords.reduce((sum, r) => sum + r.kmPerLiter, 0) / allKmRecords.length;
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentAvgKmL: avg },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: 15 } },
    });

    await refreshStationScore(stationId);

    res.status(201).json({
      ...record,
      message: suspicious
        ? 'Consumo abaixo do normal. Possível combustível ruim ou condição diferente de uso.'
        : 'Abastecimento registrado com sucesso.',
    });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao registrar abastecimento.' });
  }
});

app.get('/users/:userId/fuel-records', async (req, res) => {
  const records = await prisma.fuelRecord.findMany({
    where: { userId: req.params.userId },
    include: { station: true, vehicle: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(records);
});

// =====================================================
// ALERTA POR GPS
// O app manda latitude/longitude. Backend responde se deve alertar.
// =====================================================

app.get('/alerts/nearby', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat e lng são obrigatórios.' });
  }

  const stations = await prisma.station.findMany();
  const userLat = Number(lat);
  const userLng = Number(lng);

  const closeStations = stations
    .map((station) => ({
      ...station,
      distanceKm: calculateDistanceKm(userLat, userLng, station.latitude, station.longitude),
    }))
    .filter((station) => station.distanceKm <= 0.1)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const station = closeStations[0];

  if (!station) return res.json({ shouldAlert: false });

  if (station.trustScore <= 45 || station.hasComplaint) {
    return res.json({
      shouldAlert: true,
      type: 'danger',
      title: 'Atenção!',
      message: `${station.name} tem baixa confiança. Veja avaliações antes de abastecer.`,
      station,
    });
  }

  if (station.trustScore >= 80) {
    return res.json({
      shouldAlert: true,
      type: 'success',
      title: 'Boa escolha!',
      message: `${station.name} é bem avaliado e tem bom histórico de consumo.`,
      station,
    });
  }

  res.json({ shouldAlert: false, station });
});

// =====================================================
// SEED SIMPLES
// Rode uma vez acessando POST /seed pelo Insomnia/Postman.
// =====================================================

app.post('/seed', async (req, res) => {
  const count = await prisma.station.count();
  if (count > 0) return res.json({ message: 'Seed já existe.' });

  const created = await prisma.station.createMany({
    data: [
      {
        name: 'Posto Shell Centro',
        brand: 'Shell',
        latitude: -15.9412,
        longitude: -48.2578,
        city: 'Santo Antônio do Descoberto',
        state: 'GO',
        trustScore: 87,
        avgRating: 4.7,
        reviewCount: 128,
        gasolinePrice: 5.89,
        ethanolPrice: 4.29,
        dieselPrice: 5.99,
      },
      {
        name: 'Posto Ipiranga Av. Brasil',
        brand: 'Ipiranga',
        latitude: -15.944,
        longitude: -48.262,
        city: 'Santo Antônio do Descoberto',
        state: 'GO',
        trustScore: 79,
        avgRating: 4.5,
        reviewCount: 95,
        gasolinePrice: 5.79,
        ethanolPrice: 4.19,
        dieselPrice: 5.89,
      },
      {
        name: 'Posto BR Express',
        brand: 'BR',
        latitude: -15.948,
        longitude: -48.266,
        city: 'Santo Antônio do Descoberto',
        state: 'GO',
        trustScore: 56,
        avgRating: 3.2,
        reviewCount: 62,
        gasolinePrice: 5.69,
        ethanolPrice: 4.09,
        dieselPrice: 5.79,
      },
      {
        name: 'Posto Ale Combustíveis',
        brand: 'ALE',
        latitude: -15.952,
        longitude: -48.27,
        city: 'Santo Antônio do Descoberto',
        state: 'GO',
        trustScore: 34,
        avgRating: 2.1,
        reviewCount: 54,
        gasolinePrice: 5.99,
        ethanolPrice: 3.99,
        dieselPrice: 5.69,
        hasComplaint: true,
      },
    ],
  });

res.json({ message: 'Seed criado.', created });
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


// =====================================================
// 6) RODAR
// =====================================================
// npx prisma migrate dev --name init
// npm run dev

// Teste no navegador:
// http://localhost:3333

// Criar dados de exemplo:
// POST http://localhost:3333/seed

