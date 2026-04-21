import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface MessageAnalytics {
  totalWhatsApp: number;
  totalTelegram: number;
  todayWhatsApp: number;
  todayTelegram: number;
  dailyData: { date: string; whatsapp: number; telegram: number }[];
  whatsAppChangePercent: number;
  telegramChangePercent: number;
}

export function useMessageAnalytics(refreshKey = 0): MessageAnalytics {
  const [data, setData] = useState<MessageAnalytics>({
    totalWhatsApp: 0,
    totalTelegram: 0,
    todayWhatsApp: 0,
    todayTelegram: 0,
    dailyData: [],
    whatsAppChangePercent: 0,
    telegramChangePercent: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: recentRows, error: recentError } = await supabase
          .from("chat_messages")
          .select("timestamp, chat_sessions!inner(channel)")
          .gte("timestamp", thirtyDaysAgo);

        if (recentError) return;

        const { data: prevRows, error: prevError } = await supabase
          .from("chat_messages")
          .select("timestamp, chat_sessions!inner(channel)")
          .gte("timestamp", sixtyDaysAgo)
          .lt("timestamp", thirtyDaysAgo);

        if (prevError) return;

        // Aggregate by date and channel
        const dateCounts = new Map<string, { whatsapp: number; telegram: number }>();

        for (const row of recentRows || []) {
          const date = new Date(row.timestamp).toISOString().split("T")[0];
          if (!dateCounts.has(date)) {
            dateCounts.set(date, { whatsapp: 0, telegram: 0 });
          }
          const counts = dateCounts.get(date)!;
          const channel = (row.chat_sessions as { channel?: string })?.channel;
          if (channel === "whatsapp") {
            counts.whatsapp++;
          } else if (channel === "telegram") {
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

        // Calculate totals
        let totalWhatsApp = 0;
        let totalTelegram = 0;
        for (const counts of dateCounts.values()) {
          totalWhatsApp += counts.whatsapp;
          totalTelegram += counts.telegram;
        }

        // Calculate today's counts
        const todayStr = new Date().toISOString().split("T")[0];
        const todayCounts = dateCounts.get(todayStr) || { whatsapp: 0, telegram: 0 };
        const todayWhatsApp = todayCounts.whatsapp;
        const todayTelegram = todayCounts.telegram;

        let prevWhatsApp = 0;
        let prevTelegram = 0;
        for (const row of prevRows || []) {
          const channel = (row.chat_sessions as { channel?: string })?.channel;
          if (channel === "whatsapp") {
            prevWhatsApp++;
          } else if (channel === "telegram") {
            prevTelegram++;
          }
        }

        const whatsAppChangePercent = prevWhatsApp > 0
          ? Math.round(((totalWhatsApp - prevWhatsApp) / prevWhatsApp) * 100)
          : 0;
        const telegramChangePercent = prevTelegram > 0
          ? Math.round(((totalTelegram - prevTelegram) / prevTelegram) * 100)
          : 0;

        setData({
          totalWhatsApp,
          totalTelegram,
          todayWhatsApp,
          todayTelegram,
          dailyData,
          whatsAppChangePercent,
          telegramChangePercent,
        });
      } catch {
        // Silent error handling
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
