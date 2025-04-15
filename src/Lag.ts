import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// requete postman : http://localhost:3002/recommandations/lags

(async () => {
  try {
    console.log("Connexion à PostgreSQL...");

    await prisma.$connect();
    console.log("Connexion réussie !");

    const targetItemIds = [434, 419, 697, 853, 717];

    const results = await prisma.$queryRaw`
    WITH ranked_views AS (
        SELECT 
            p.item_id AS purchased_item,
            s.item_id AS viewed_item,
            ROW_NUMBER() OVER (PARTITION BY p.item_id ORDER BY s.date DESC) AS view_rank
        FROM public.sessions s
        JOIN public.purchases p ON s.session_id = p.session_id
        WHERE p.item_id = ANY(ARRAY[${Prisma.join(targetItemIds)}])
    ),
    lagged_views AS (
        SELECT 
            purchased_item,
            CONCAT(
                COALESCE(LAG(viewed_item, 1) OVER (PARTITION BY purchased_item ORDER BY view_rank)::TEXT, ''),
                ', ',
                COALESCE(LAG(viewed_item, 2) OVER (PARTITION BY purchased_item ORDER BY view_rank)::TEXT, ''),
                ', ',
                COALESCE(LAG(viewed_item, 3) OVER (PARTITION BY purchased_item ORDER BY view_rank)::TEXT, ''),
                ', ',
                COALESCE(LAG(viewed_item, 4) OVER (PARTITION BY purchased_item ORDER BY view_rank)::TEXT, '')
            ) AS viewed_items
        FROM ranked_views
    )
    SELECT DISTINCT purchased_item, viewed_items FROM lagged_views WHERE viewed_items IS NOT NULL;
  `;

    console.log("Résultats récupérés :", results);
  } catch (error) {
    console.error("Erreur lors de la récupération des données :", error);
  } finally {
    await prisma.$disconnect();
    console.log("Déconnexion de Prisma.");
  }
})();
