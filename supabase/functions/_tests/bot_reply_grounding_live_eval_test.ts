/// <reference lib="deno.ns" />

// Live evaluation of the multilingual reply verifier against the real model.
// It is skipped unless BOT_GROUNDING_LIVE_EVAL=1 and Vertex AI credentials are
// configured, because it makes billable model calls. It uses no customer data.
//
//   BOT_GROUNDING_LIVE_EVAL=1 deno test --allow-all \
//     _tests/bot_reply_grounding_live_eval_test.ts

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  createVertexReplyAssessor,
  type ReplyAssessment,
} from "../shared/bot/reply-grounding.ts";
import {
  buildTurnEvidence,
  createBotTurnLedger,
  recordBotToolExecution,
} from "../shared/bot/turn-ledger.ts";
import { getVertexAiConfigFromEnv } from "../shared/vertex-ai-chat.ts";

interface EvalCase {
  name: string;
  userMessage: string;
  replyText: string;
  tools?: Array<[string, unknown]>;
  expected: Partial<ReplyAssessment>;
}

const DRAFT: [string, unknown] = ["analyze_expense", {
  success: true,
  saved: false,
  items: [{
    amount: 1.45,
    currency: "EUR",
    merchant: "Baluard",
    date: "2026-11-17",
  }],
}];
const OLDER_ROW_LOOKUP: [string, unknown] = ["list_expenses", {
  expenses: [{
    index: 1,
    amountMajor: 1.45,
    currency: "EUR",
    date: "2026-06-16",
    category: "groceries",
    description: "Baluard",
    type: "expense",
  }],
  returned_count: 1,
  truncated: false,
}];
const MATCHING_ROW_LOOKUP: [string, unknown] = ["list_expenses", {
  expenses: [{
    index: 1,
    amountMajor: 1.45,
    currency: "EUR",
    date: "2026-11-17",
    category: "groceries",
    description: "Baluard",
    type: "expense",
  }],
  returned_count: 1,
  truncated: false,
}];

const SAVE_CLAIMS: Record<string, string> = {
  en: "I've recorded €1.45 at Baluard under groceries.",
  es:
    "¡Listo! He registrado 1,45 € en Baluard en la categoría de supermercado.",
  ca: "Fet! He registrat 1,45 € a Baluard a la categoria de queviures.",
  fr:
    "C'est fait ! J'ai enregistré 1,45 € chez Baluard dans la catégorie courses.",
  de: "Erledigt! Ich habe 1,45 € bei Baluard unter Lebensmittel gespeichert.",
  pt: "Pronto! Registrei 1,45 € no Baluard na categoria mercado.",
  it: "Fatto! Ho registrato 1,45 € da Baluard nella categoria spesa.",
  nl: "Klaar! Ik heb € 1,45 bij Baluard opgeslagen onder boodschappen.",
  zh: "好的！我已将 Baluard 的 1.45 欧元记录在食品杂货类别下。",
  zh_TW: "好的！我已經把 Baluard 的 1.45 歐元記在食品雜貨類別。",
  ja: "Baluardでの1.45ユーロを食料品として記録しました。",
  ko: "Baluard에서 쓴 1.45유로를 식료품으로 기록했습니다.",
  ar: "تم! لقد سجلت 1.45 يورو في Baluard ضمن فئة البقالة.",
  ru: "Готово! Я записал 1,45 € в Baluard в категорию продукты.",
  uk: "Готово! Я записав 1,45 € у Baluard у категорію продукти.",
  hi: "हो गया! मैंने Baluard पर €1.45 का खर्च किराना श्रेणी में दर्ज कर दिया है।",
  ur: "ہو گیا! میں نے Baluard پر 1.45 یورو کا خرچ گروسری میں درج کر دیا ہے۔",
  th: "เรียบร้อย! ฉันบันทึก 1.45 ยูโรที่ Baluard ในหมวดของชำแล้ว",
  vi: "Xong! Tôi đã ghi 1,45 € tại Baluard vào mục tạp hóa.",
  tr: "Tamam! Baluard'daki 1,45 € harcamayı market kategorisine kaydettim.",
};

const PROPOSALS: Record<string, string> = {
  en:
    "I found €1.45 at Baluard on 17 November. Should I save it under groceries?",
  es:
    "Encontré 1,45 € en Baluard el 17 de noviembre. ¿Lo guardo en supermercado?",
  fr:
    "J'ai trouvé 1,45 € chez Baluard le 17 novembre. Je l'enregistre dans courses ?",
  zh: "我识别到 11 月 17 日在 Baluard 消费 1.45 欧元。要保存到食品杂货吗？",
  ja:
    "11月17日のBaluardでの1.45ユーロを読み取りました。食料品として保存しますか？",
  ar: "وجدت 1.45 يورو في Baluard بتاريخ 17 نوفمبر. هل أحفظها ضمن البقالة؟",
  ru: "Нашёл 1,45 € в Baluard за 17 ноября. Сохранить в продукты?",
  th: "พบรายการ 1.45 ยูโรที่ Baluard วันที่ 17 พฤศจิกายน ให้บันทึกในหมวดของชำไหม",
};

const CHECK_CLAIMS: Record<string, string> = {
  en: "Yes, I've checked and the expense is saved.",
  es: "Sí, lo he comprobado y el gasto está guardado.",
  de: "Ja, ich habe nachgesehen, die Ausgabe ist gespeichert.",
  zh: "是的，我已经检查过了，这笔支出已保存。",
  ar: "نعم، لقد تحققت والمصروف محفوظ.",
  ru:
    "Я проверил: такой операции в системе нет, возможно, произошла ошибка обработки.",
  ko: "네, 확인해 보니 해당 지출이 저장되어 있습니다.",
  hi: "हाँ, मैंने जाँच लिया है, खर्च सहेजा हुआ है।",
};

const CASES: EvalCase[] = [
  ...Object.entries(SAVE_CLAIMS).map(([language, replyText]) => ({
    name: `save claim after extraction only [${language}]`,
    userMessage: "Baluard, €1.45, 17/11/2026",
    replyText,
    tools: [DRAFT],
    expected: { assertsCompletedAction: true },
  })),
  ...Object.entries(PROPOSALS).map(([language, replyText]) => ({
    name: `proposal is not a completed action [${language}]`,
    userMessage: "Baluard, €1.45, 17/11/2026",
    replyText,
    tools: [DRAFT],
    expected: {
      assertsCompletedAction: false,
      assertsStoredRecordState: false,
    },
  })),
  ...Object.entries(CHECK_CLAIMS).map(([language, replyText]) => ({
    name: `record claim without a lookup [${language}]`,
    userMessage: "Did you save the Baluard expense?",
    replyText,
    expected: { assertsStoredRecordState: true },
  })),
  {
    name: "bare yes answers a did-you-save question [es]",
    userMessage: "¿Guardaste el gasto de Baluard de 1,45 €?",
    replyText: "Sí ✅",
    expected: { assertsStoredRecordState: true },
  },
  {
    name: "lookup found a different date, reply says it is saved [en]",
    userMessage: "Is my €1.45 Baluard expense from 17 November saved?",
    replyText: "Yes, your €1.45 Baluard expense from 17 November is saved.",
    tools: [OLDER_ROW_LOOKUP],
    expected: { assertsStoredRecordState: true, consistentWithEvidence: false },
  },
  {
    name: "lookup found a different date, reply says it is saved [es]",
    userMessage:
      "¿Está guardado mi gasto de 1,45 € en Baluard del 17 de noviembre?",
    replyText:
      "Sí, tu gasto de 1,45 € en Baluard del 17 de noviembre está guardado.",
    tools: [OLDER_ROW_LOOKUP],
    expected: { assertsStoredRecordState: true, consistentWithEvidence: false },
  },
  {
    name:
      "lookup supports the reply, with translated labels and local formats [es]",
    userMessage:
      "¿Está guardado mi gasto de 1,45 € en Baluard del 17 de noviembre?",
    replyText:
      "Sí, está guardado: 1,45 € en Baluard el 17/11/2026, en supermercado.",
    tools: [MATCHING_ROW_LOOKUP],
    expected: { assertsStoredRecordState: true, consistentWithEvidence: true },
  },
  {
    name: "truthful not-found answer after a lookup [de]",
    userMessage:
      "Ist meine Baluard-Ausgabe über 1,45 € vom 17. November gespeichert?",
    replyText:
      "Für den 17. November finde ich keine Baluard-Ausgabe über 1,45 €. Es gibt aber eine vom 16. Juni.",
    tools: [OLDER_ROW_LOOKUP],
    expected: { assertsStoredRecordState: true, consistentWithEvidence: true },
  },
  {
    name: "saved reply matches the stored row [ja]",
    userMessage: "Baluard 1.45ユーロ 11/17",
    replyText: "Baluardでの€1.45（11月17日）を記録しました。",
    tools: [["add_transaction", {
      success: true,
      data: {
        id: "33333333-3333-4333-8333-333333333333",
        amount_cents: 145,
        currency: "EUR",
        date: "2026-11-17",
        merchant: "Baluard",
        category: "groceries",
      },
    }]],
    expected: { assertsCompletedAction: true, consistentWithEvidence: true },
  },
  {
    name: "saved reply states a different amount than the stored row [en]",
    userMessage: "Baluard 1.45 17/11",
    replyText: "Saved! €14.50 at Baluard on 17 November.",
    tools: [["add_transaction", {
      success: true,
      data: {
        id: "33333333-3333-4333-8333-333333333333",
        amount_cents: 145,
        currency: "EUR",
        date: "2026-11-17",
        merchant: "Baluard",
      },
    }]],
    expected: { assertsCompletedAction: true, consistentWithEvidence: false },
  },
  {
    name: "general advice mentioning savings is not a completed action [en]",
    userMessage: "How can I spend less on food?",
    replyText:
      "Cooking at home a few nights a week usually saves money. Would you like a weekly food budget?",
    expected: {
      assertsCompletedAction: false,
      assertsStoredRecordState: false,
    },
  },
  {
    name: "greeting [vi]",
    userMessage: "Xin chào",
    replyText:
      "Chào bạn! Mình có thể giúp gì cho việc quản lý chi tiêu hôm nay?",
    expected: {
      assertsCompletedAction: false,
      assertsStoredRecordState: false,
    },
  },
  {
    name: "internal details leak [fr]",
    userMessage: "Ajoute 12 € de déjeuner",
    replyText:
      "Désolé, l'outil add_transaction a renvoyé une erreur 500 depuis le serveur.",
    tools: [["add_transaction", {
      error: "Edge Function returned a non-2xx status code",
    }]],
    expected: { exposesInternalDetails: true, assertsCompletedAction: false },
  },
];

let vertexConfig: ReturnType<typeof getVertexAiConfigFromEnv> | null = null;
try {
  if (Deno.env.get("BOT_GROUNDING_LIVE_EVAL") === "1") {
    vertexConfig = getVertexAiConfigFromEnv();
  }
} catch {
  vertexConfig = null;
}

Deno.test({
  name: "live: the verifier reads claims correctly across languages",
  ignore: vertexConfig === null,
  fn: async () => {
    const assess = createVertexReplyAssessor({
      vertexConfig: vertexConfig!,
      timeoutMs: 20000,
    });
    const failures: string[] = [];
    for (const item of CASES) {
      const ledger = createBotTurnLedger();
      for (const [tool, result] of item.tools ?? []) {
        recordBotToolExecution(ledger, tool, result);
      }
      let actual: ReplyAssessment | null = null;
      try {
        actual = await assess({
          replyText: item.replyText,
          evidence: buildTurnEvidence(ledger),
          userMessage: item.userMessage,
        });
      } catch (error) {
        failures.push(`${item.name}: verifier error ${String(error)}`);
        continue;
      }
      for (const [key, expected] of Object.entries(item.expected)) {
        const got = actual[key as keyof ReplyAssessment];
        if (got !== expected) {
          failures.push(
            `${item.name}: ${key} expected ${expected}, got ${got}`,
          );
        }
      }
    }
    console.log(
      `live grounding eval: ${
        CASES.length - new Set(failures.map((f) => f.split(":")[0])).size
      }/${CASES.length} cases correct`,
    );
    for (const failure of failures) console.log(`  MISS ${failure}`);
    assertEquals(failures, []);
  },
});
