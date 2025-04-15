import { PrismaClient } from "@prisma/client";

const express = require("express");

// Prisma : interagir avec la bdd PostgreSQL grâce à une interface en TS
const prisma = new PrismaClient();
const app = express();
app.use(express.json()); // Permet de traiter les requêtes JSON

// requete postman : Get http://localhost:3001/recommendations body : {"Recommendation": []}
// requete postman : Post http://localhost:3001/recommendations/id body  {"targetItemIds": [434, 419, 697, 853, 717]}

// Route pour récupérer les recommandations de plusieurs produits
app.post("/recommandations", async (req: any, res: any) => {
  try {
    const { targetItemIds } = req.body;

    // Vérification : targetItemIds doit être un tableau
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

    // BigInt : entier très grand, utilisé quand un Number n’est pas suffisant.
    // Convertir BigInt en Number
    const safeResults = results.map((row) => ({
      purchased_item: Number(row.purchased_item),
      viewed_item: Number(row.viewed_item),
      view_count: Number(row.view_count),
    }));

    // Réponse envoyée au client
    res.json({ recommandations: safeResults });
  } catch (error) {
    console.error("Erreur lors du traitement :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour obtenir les recommandations pour un seul produit acheté
app.get("/recommandations/:purchasedItemId", function (req: any, res: any) {
  const purchasedItemId = parseInt(req.params.purchasedItemId);
  console.log("Produit acheté reçu :", purchasedItemId);

  // NaN = Not a Number, donc l'ID doit être un nombre
  if (isNaN(purchasedItemId)) {
    return res
      .status(400)
      .json({ error: "L'ID du produit acheté doit être un nombre valide." });
  }

  prisma
    .$queryRawUnsafe<
      { purchased_item: bigint; viewed_item: bigint; view_count: bigint }[]
    >(
      `
      SELECT purchased_item, viewed_item, view_count
      FROM (
          SELECT
              p.item_id AS purchased_item,
              s.item_id AS viewed_item,
              COUNT(*) AS view_count,
              ROW_NUMBER() OVER (PARTITION BY p.item_id ORDER BY COUNT(*) DESC) AS rank
          FROM public.sessions s
          JOIN public.purchases p ON s.session_id = p.session_id
          WHERE p.item_id = ${purchasedItemId}
          GROUP BY p.item_id, s.item_id
      ) ranked
      WHERE rank <= 3
      ORDER BY purchased_item, rank;
  `
    )
    .then(function (results) {
      console.log("Résultats SQL :", results);

      // Convertir BigInt en Number
      const safeResults = results.map(function (row) {
        return {
          purchased_item: Number(row.purchased_item),
          viewed_item: Number(row.viewed_item),
          view_count: Number(row.view_count),
        };
      });

      res.json({ recommandations: safeResults });
    })
    .catch(function (error) {
      console.error("Erreur lors du traitement :", error);
      res.status(500).json({ error: "Erreur serveur" });
    });
});

// Démarrer le serveur
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
