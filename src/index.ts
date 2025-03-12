import { Prisma, PrismaClient } from "@prisma/client";
import { Recommendation } from "./recommandation_interface";

const express = require("express");
const prisma = new PrismaClient();
const app = express();
app.use(express.json()); // Permet de traiter les requêtes JSON

// Route pour récupérer les recommandations
app.post("/recommendations", async (req: any, res: any) => {
  try {
    const { targetItemIds } = req.body;

    if (!targetItemIds || !Array.isArray(targetItemIds)) {
      return res
        .status(400)
        .json({ error: "targetItemIds doit être un tableau de nombres." });
    }

    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT purchased_item, viewed_item, view_count
      FROM (
          SELECT
              p.item_id AS purchased_item,
              s.item_id AS viewed_item,
              COUNT(*) AS view_count,
              ROW_NUMBER() OVER (PARTITION BY p.item_id ORDER BY COUNT(*) DESC) AS rank
          FROM public.sessions s
          JOIN public.purchases p ON s.session_id = p.session_id
          WHERE p.item_id IN (${targetItemIds.join(",")})
          GROUP BY p.item_id, s.item_id
      ) ranked
      WHERE rank <= 3
      ORDER BY purchased_item, rank;
    `);

    console.log("Résultats bruts de Prisma :", results); // Debugging

    // 🔄 Convertir BigInt en Number
    const safeResults = results.map((row) => ({
      purchased_item: Number(row.purchased_item),
      viewed_item: Number(row.viewed_item),
      view_count: Number(row.view_count),
    }));

    res.json({ recommendations: safeResults });
  } catch (error) {
    console.error("❌ Erreur lors du traitement :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Démarrer le serveur
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
