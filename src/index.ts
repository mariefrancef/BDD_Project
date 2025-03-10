import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  try {
    console.log("🔄 Connexion à PostgreSQL...");

    // Vérifier si Prisma se connecte bien
    await prisma.$connect();
    console.log("✅ Connexion réussie !");

    const targetItemIds = [434, 419, 697, 853, 717];

    const results = await prisma.$queryRaw`
      SELECT purchased_item, viewed_item, view_count
      FROM (
          SELECT
              p.item_id AS purchased_item,
              s.item_id AS viewed_item,
              COUNT(*) AS view_count,
              ROW_NUMBER() OVER (PARTITION BY p.item_id ORDER BY COUNT(*) DESC) AS rank
          FROM public.sessions s
          JOIN public.purchases p ON s.session_id = p.session_id
          WHERE p.item_id IN (${Prisma.join(targetItemIds)})
          GROUP BY p.item_id, s.item_id
      ) ranked
      WHERE rank <= 3
      ORDER BY purchased_item, rank;
    `;

    console.log("🟢 Résultats récupérés :", results);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des données :", error);
  } finally {
    await prisma.$disconnect();
    console.log("🔴 Déconnexion de Prisma.");
  }
})();

// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// (async () => {
//   try {
//     const purchases = await prisma.purchases.findMany();
//     console.log(purchases);
//   } catch (error) {
//     console.error("Erreur lors de la récupération des données :", error);
//   } finally {
//     await prisma.$disconnect();
//   }
// })();
