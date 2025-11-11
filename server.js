// server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// === Middleware ===
app.use(cors());
app.use(bodyParser.json());

// === MongoDB Atlas ===
const uri =
  "mongodb+srv://ademarfaoui2018_db_user:zRef7YYdXA3WbJEf@diagramme-de-classe.yyvu1wh.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let collection;

// Connexion à la base
async function connectDB() {
  try {
    await client.connect();
    const db = client.db("UMLDatabase");
    collection = db.collection("Scores");
    console.log("Connecté à MongoDB !");
  } catch (err) {
    console.error(err);
  }
}
connectDB();

// === Enregistrer score d'un étudiant ===
app.post("/submit-score", async (req, res) => {
  const { name, score } = req.body;

  if (!name || score == null) {
    return res
      .status(400)
      .json({ message: "Nom d'utilisateur et score requis" });
  }

  try {
    const result = await collection.insertOne({
      name,
      score,
      date: new Date(),
    });
    res.json({
      message: "Score enregistré avec succès",
      id: result.insertedId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// === Récupérer statistiques ===
app.get("/api/stats", async (req, res) => {
  try {
    const total = await collection.countDocuments();

    // Moyenne générale
    const agg = await collection
      .aggregate([{ $group: { _id: null, avgScore: { $avg: "$score" } } }])
      .toArray();
    const moyenne = agg[0]?.avgScore || 0;

    // Participants avec score > 6
    const countPlus6 = await collection.countDocuments({ score: { $gt: 6 } });

    // Top 10 meilleurs scores
    const top10 = await collection
      .find()
      .sort({ score: -1 })
      .limit(10)
      .project({ _id: 0, name: 1, score: 1 })
      .toArray();

    // Pourcentage de réussite
    const pourcentageCompris =
      total > 0 ? Math.round((countPlus6 / total) * 100) : 0;

    res.json({
      total,
      moyenne: moyenne.toFixed(2),
      top10,
      countPlus6,
      pourcentageCompris,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des statistiques" });
  }
});

// === Démarrage serveur ===
app.listen(port, () => {
  console.log(`Serveur Node.js démarré sur http://localhost:${port}`);
});
