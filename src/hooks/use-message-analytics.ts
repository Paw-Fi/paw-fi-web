import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface MessageAnalytics {
  totalWhatsApp: number;
  totalTelegram: number;
  dailyData: { date: string; whatsapp: number; telegram: number }[];
  whatsAppChangePercent: number;
  telegramChangePercent: number;
}

export function useMessageAnalytics(refreshKey = 0): MessageAnalytics {
  const [data, setData] = useState<MessageAnalytics>({
    totalWhatsApp: 0,
    totalTelegram: 0,
    dailyData: [],
    whatsAppChangePercent: 0,
    telegramChangePercent: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch last 30 days of messages
      const { data: recentRows, error: recentError } = await supabase
        .from("messages")
        .select("created_at, channel")
        .gte("created_at", thirtyDaysAgo);

      // Fetch previous 30 days for comparison
      const { data: prevRows, error: prevError } = await supabase
        .from("messages")
        .select("created_at, channel")
        .gte("created_at", sixtyDaysAgo)
        .lt("created_at", thirtyDaysAgo);

      if (!recentError && !prevError && recentRows && prevRows) {
        // Aggregate by date and channel
        const dateCounts = new Map<string, { whatsapp: number; telegram: number }>();
        
        for (const row of recentRows) {
          const date = new Date(row.created_at).toISOString().split("T")[0];
          if (!dateCounts.has(date)) {
            dateCounts.set(date, { whatsapp: 0, telegram: 0 });
          }
          const counts = dateCounts.get(date)!;
          if (row.channel === "whatsapp") {
            counts.whatsapp++;
          } else if (row.channel === "telegram") {
            counts.telegram++;
          }
        }

        // Fill in missing dates
        const dailyData: { date: string; whatsapp: number; telegram: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const counts = dateCounts.get(date) || { whatsapp: 0, telegram: 0 };
          dailyData.push({ date, ...counts });
        }

        const totalWhatsApp = recentRows.filter(r => r.channel === "whatsapp").length;
        const totalTelegram = recentRows.filter(r => r.channel === "telegram").length;
        
        const prevWhatsApp = prevRows.filter(r => r.channel === "whatsapp").length;
        const prevTelegram = prevRows.filter(r => r.channel === "telegram").length;

        const whatsAppChangePercent = prevWhatsApp > 0
          ? Math.round(((totalWhatsApp - prevWhatsApp) / prevWhatsApp) * 100)
          : 0;
        const telegramChangePercent = prevTelegram > 0
          ? Math.round(((totalTelegram - prevTelegram) / prevTelegram) * 100)
          : 0;

        setData({
          totalWhatsApp,
          totalTelegram,
          dailyData,
          whatsAppChangePercent,
          telegramChangePercent,
        });
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
