interface FounderEmailMessage {
  subject: string;
  paragraphs: readonly string[];
}

interface FounderEmailTranslation {
  greeting: string;
  namedGreeting: string;
  signature: string;
  welcome: FounderEmailMessage;
  cancellation: FounderEmailMessage;
}

const english: FounderEmailTranslation = {
  greeting: "Hi,",
  namedGreeting: "Hi {name},",
  signature: "Co-founder, Moneko",
  welcome: {
    subject: "Quick question about Moneko",
    paragraphs: [
      "Yifan here, one of the co-founders of Moneko. I saw you joined recently and thought I’d say hi.",
      "Out of curiosity, what were you using to manage your money before Moneko?",
      "Also, if you need more time to try things out, let me know. Happy to extend your free trial.",
    ],
  },
  cancellation: {
    subject: "Quick question about your Moneko subscription",
    paragraphs: [
      "Yifan here, co-founder of Moneko. I saw you recently cancelled your subscription and wanted to ask you directly.",
      "What made you decide to stop using Moneko?",
      "Feel free to be completely honest — if something was frustrating, missing, too expensive, or just not useful enough, I’d like to know.",
      "If you’re open to giving Moneko another try, I’d be happy to offer you 50% off. Just reply to this email and I’ll sort it out for you.",
    ],
  },
};

const translations: Readonly<Record<string, FounderEmailTranslation>> = {
  en: english,
  de: {
    greeting: "Hallo,",
    namedGreeting: "Hallo {name},",
    signature: "Mitgründer von Moneko",
    welcome: {
      subject: "Eine kurze Frage zu Moneko",
      paragraphs: [
        "Hier ist Yifan, einer der Mitgründer von Moneko. Ich habe gesehen, dass du seit Kurzem dabei bist, und wollte kurz Hallo sagen.",
        "Aus Neugier: Womit hast du deine Finanzen vor Moneko verwaltet?",
        "Falls du noch etwas mehr Zeit zum Ausprobieren brauchst, sag einfach Bescheid. Ich verlängere dir gern deine kostenlose Testphase.",
      ],
    },
    cancellation: {
      subject: "Eine kurze Frage zu deinem Moneko-Abo",
      paragraphs: [
        "Hier ist Yifan, Mitgründer von Moneko. Ich habe gesehen, dass du dein Abo vor Kurzem gekündigt hast, und wollte dich direkt fragen.",
        "Was hat dich dazu gebracht, Moneko nicht mehr zu nutzen?",
        "Du kannst ganz ehrlich sein. Wenn dich etwas genervt hat, etwas gefehlt hat, es zu teuer war oder dir einfach nicht genug gebracht hat, würde ich das gern wissen.",
        "Wenn du Moneko noch eine Chance geben möchtest, biete ich dir gern 50 % Rabatt an. Antworte einfach auf diese E-Mail, dann kümmere ich mich darum.",
      ],
    },
  },
  es: {
    greeting: "Hola,",
    namedGreeting: "Hola {name},",
    signature: "Cofundador de Moneko",
    welcome: {
      subject: "Una pregunta rápida sobre Moneko",
      paragraphs: [
        "Soy Yifan, uno de los cofundadores de Moneko. Vi que te uniste hace poco y quería saludarte.",
        "Por curiosidad, ¿qué usabas para llevar tus finanzas antes de Moneko?",
        "Y si necesitas más tiempo para probarlo, avísame. Con gusto te amplío la prueba gratuita.",
      ],
    },
    cancellation: {
      subject: "Una pregunta rápida sobre tu suscripción a Moneko",
      paragraphs: [
        "Soy Yifan, cofundador de Moneko. Vi que cancelaste tu suscripción hace poco y quería preguntarte directamente.",
        "¿Qué te hizo decidir dejar de usar Moneko?",
        "Puedes decirme lo que piensas con toda confianza. Si algo te frustró, faltaba alguna función, te pareció caro o simplemente no te resultó tan útil, me gustaría saberlo.",
        "Si te apetece darle otra oportunidad a Moneko, con gusto te ofrezco un 50 % de descuento. Solo responde a este correo y yo me encargo.",
      ],
    },
  },
  fr: {
    greeting: "Bonjour,",
    namedGreeting: "Bonjour {name},",
    signature: "Cofondateur de Moneko",
    welcome: {
      subject: "Une petite question sur Moneko",
      paragraphs: [
        "C’est Yifan, l’un des cofondateurs de Moneko. J’ai vu que tu nous avais rejoints récemment et je voulais te dire bonjour.",
        "Par curiosité, qu’est-ce que tu utilisais pour gérer ton argent avant Moneko ?",
        "Et si tu as besoin de plus de temps pour essayer, dis-le-moi. Je peux prolonger ton essai gratuit avec plaisir.",
      ],
    },
    cancellation: {
      subject: "Une petite question sur ton abonnement Moneko",
      paragraphs: [
        "C’est Yifan, cofondateur de Moneko. J’ai vu que tu avais récemment annulé ton abonnement et je voulais te poser la question directement.",
        "Qu’est-ce qui t’a donné envie d’arrêter d’utiliser Moneko ?",
        "N’hésite pas à me dire franchement ce que tu en penses. Si quelque chose t’a agacé, s’il manquait une fonction, si c’était trop cher ou simplement pas assez utile, j’aimerais le savoir.",
        "Si tu veux redonner une chance à Moneko, je peux te proposer une réduction de 50 %. Réponds simplement à cet e-mail et je m’en occupe.",
      ],
    },
  },
  it: {
    greeting: "Ciao,",
    namedGreeting: "Ciao {name},",
    signature: "Cofondatore di Moneko",
    welcome: {
      subject: "Una domanda veloce su Moneko",
      paragraphs: [
        "Sono Yifan, uno dei cofondatori di Moneko. Ho visto che ti sei unito da poco e volevo salutarti.",
        "Per curiosità, cosa usavi per gestire i tuoi soldi prima di Moneko?",
        "Se ti serve un po’ più di tempo per provarlo, fammi sapere. Prolungo volentieri la tua prova gratuita.",
      ],
    },
    cancellation: {
      subject: "Una domanda veloce sul tuo abbonamento Moneko",
      paragraphs: [
        "Sono Yifan, cofondatore di Moneko. Ho visto che hai annullato da poco il tuo abbonamento e volevo chiedertelo direttamente.",
        "Cosa ti ha fatto decidere di smettere di usare Moneko?",
        "Dimmi pure cosa ne pensi, senza filtri. Se qualcosa ti ha dato fastidio, mancava una funzione, costava troppo o semplicemente non ti era abbastanza utile, mi piacerebbe saperlo.",
        "Se ti va di dare un’altra possibilità a Moneko, ti offro volentieri uno sconto del 50%. Rispondi a questa email e ci penso io.",
      ],
    },
  },
  ja: {
    greeting: "こんにちは。",
    namedGreeting: "{name}さん、こんにちは。",
    signature: "Moneko共同創業者",
    welcome: {
      subject: "Monekoについて、ひとつ質問です",
      paragraphs: [
        "Monekoの共同創業者のYifanです。最近登録してくださったのを見て、ご挨拶したくてメールしました。",
        "よかったら教えてください。Monekoを使う前は、どんな方法でお金を管理していましたか？",
        "もう少し試す時間がほしければ、気軽に教えてください。無料お試し期間を延長します。",
      ],
    },
    cancellation: {
      subject: "Monekoのご解約について、ひとつ質問です",
      paragraphs: [
        "Monekoの共同創業者のYifanです。最近サブスクリプションを解約されたのを見て、直接お話を聞きたくてメールしました。",
        "Monekoの利用をやめようと思ったきっかけは何でしたか？",
        "使いにくいところや足りない機能、料金のこと、あまり役に立たなかったなど、率直な感想を聞かせてもらえるとうれしいです。",
        "もしもう一度Monekoを試してみてもよければ、50%割引をご用意します。このメールに返信していただければ、私が手配します。",
      ],
    },
  },
  ko: {
    greeting: "안녕하세요,",
    namedGreeting: "{name}님, 안녕하세요.",
    signature: "Moneko 공동 창업자",
    welcome: {
      subject: "Moneko에 대해 하나만 여쭤볼게요",
      paragraphs: [
        "Moneko 공동 창업자 Yifan입니다. 최근에 가입하신 걸 보고 인사드리고 싶어 메일을 보냈어요.",
        "궁금한 게 있는데요, Moneko를 쓰기 전에는 어떤 방법으로 돈을 관리하셨나요?",
        "조금 더 써볼 시간이 필요하시면 편하게 말씀해 주세요. 무료 체험 기간을 연장해 드릴게요.",
      ],
    },
    cancellation: {
      subject: "Moneko 구독에 대해 하나만 여쭤볼게요",
      paragraphs: [
        "Moneko 공동 창업자 Yifan입니다. 최근에 구독을 취소하신 걸 보고 직접 여쭤보고 싶어 메일을 보냈어요.",
        "Moneko 사용을 그만두기로 하신 이유가 무엇인가요?",
        "불편한 점이 있었는지, 필요한 기능이 없었는지, 가격이 부담됐는지, 아니면 별로 도움이 되지 않았는지 솔직하게 알려주시면 좋겠어요.",
        "Moneko를 한 번 더 써보고 싶으시다면 50% 할인해 드릴게요. 이 메일에 답장만 주시면 제가 처리해 드리겠습니다.",
      ],
    },
  },
  nl: {
    greeting: "Hoi,",
    namedGreeting: "Hoi {name},",
    signature: "Medeoprichter van Moneko",
    welcome: {
      subject: "Een korte vraag over Moneko",
      paragraphs: [
        "Yifan hier, een van de medeoprichters van Moneko. Ik zag dat je er sinds kort bij bent en wilde even gedag zeggen.",
        "Uit nieuwsgierigheid: wat gebruikte je om je geldzaken bij te houden voordat je Moneko ontdekte?",
        "Als je wat meer tijd nodig hebt om alles uit te proberen, laat het me weten. Ik verleng je gratis proefperiode graag.",
      ],
    },
    cancellation: {
      subject: "Een korte vraag over je Moneko-abonnement",
      paragraphs: [
        "Yifan hier, medeoprichter van Moneko. Ik zag dat je onlangs je abonnement hebt opgezegd en wilde je zelf iets vragen.",
        "Waarom heb je besloten om te stoppen met Moneko?",
        "Je mag helemaal eerlijk zijn. Als iets frustrerend was, er iets ontbrak, het te duur was of gewoon niet nuttig genoeg, hoor ik dat graag.",
        "Als je Moneko nog een kans wilt geven, bied ik je graag 50% korting aan. Antwoord gewoon op deze mail, dan regel ik het voor je.",
      ],
    },
  },
  ru: {
    greeting: "Здравствуйте!",
    namedGreeting: "Здравствуйте, {name}!",
    signature: "Сооснователь Moneko",
    welcome: {
      subject: "Небольшой вопрос о Moneko",
      paragraphs: [
        "Это Yifan, один из сооснователей Moneko. Увидел, что вы недавно зарегистрировались, и решил поздороваться.",
        "Любопытно, чем вы пользовались для учёта финансов до Moneko?",
        "Если нужно больше времени, чтобы всё попробовать, напишите мне. С радостью продлю бесплатный пробный период.",
      ],
    },
    cancellation: {
      subject: "Небольшой вопрос о вашей подписке Moneko",
      paragraphs: [
        "Это Yifan, сооснователь Moneko. Увидел, что вы недавно отменили подписку, и решил спросить вас напрямую.",
        "Почему вы решили перестать пользоваться Moneko?",
        "Можно совершенно честно. Если что-то раздражало, не хватало нужной функции, было слишком дорого или просто не приносило пользы, мне хотелось бы об этом узнать.",
        "Если захотите дать Moneko ещё один шанс, с радостью предложу скидку 50%. Просто ответьте на это письмо, и я всё устрою.",
      ],
    },
  },
  th: {
    greeting: "สวัสดีครับ",
    namedGreeting: "สวัสดีคุณ {name} ครับ",
    signature: "ผู้ร่วมก่อตั้ง Moneko",
    welcome: {
      subject: "ขอถามสั้น ๆ เกี่ยวกับ Moneko ครับ",
      paragraphs: [
        "ผม Yifan หนึ่งในผู้ร่วมก่อตั้ง Moneko ครับ เห็นว่าคุณเพิ่งสมัครเข้ามา เลยอยากแวะมาทักทาย",
        "อยากรู้ว่าก่อนใช้ Moneko คุณใช้อะไรจัดการเรื่องเงินอยู่ครับ?",
        "ถ้าอยากได้เวลาลองใช้เพิ่ม บอกผมได้เลยนะครับ ยินดีต่อช่วงทดลองใช้ฟรีให้ครับ",
      ],
    },
    cancellation: {
      subject: "ขอถามสั้น ๆ เกี่ยวกับการสมัครสมาชิก Moneko ของคุณครับ",
      paragraphs: [
        "ผม Yifan ผู้ร่วมก่อตั้ง Moneko ครับ เห็นว่าคุณเพิ่งยกเลิกการสมัครสมาชิก เลยอยากถามคุณโดยตรง",
        "อะไรทำให้คุณตัดสินใจเลิกใช้ Moneko ครับ?",
        "บอกได้ตามตรงเลยนะครับ ไม่ว่าจะเป็นจุดที่ใช้งานแล้วหงุดหงิด ฟีเจอร์ที่ยังขาด ราคาที่สูงไป หรือแค่ยังไม่ตอบโจทย์ ผมอยากฟังครับ",
        "ถ้าอยากลองให้โอกาส Moneko อีกครั้ง ผมยินดีให้ส่วนลด 50% ครับ แค่ตอบกลับอีเมลนี้ เดี๋ยวผมจัดการให้",
      ],
    },
  },
  uk: {
    greeting: "Вітаю!",
    namedGreeting: "Вітаю, {name}!",
    signature: "Співзасновник Moneko",
    welcome: {
      subject: "Невелике запитання про Moneko",
      paragraphs: [
        "Це Yifan, один зі співзасновників Moneko. Побачив, що ви нещодавно зареєструвалися, і вирішив привітатися.",
        "Цікаво, чим ви користувалися для ведення фінансів до Moneko?",
        "Якщо потрібно більше часу, щоб усе спробувати, напишіть мені. З радістю продовжу безкоштовний пробний період.",
      ],
    },
    cancellation: {
      subject: "Невелике запитання про вашу підписку Moneko",
      paragraphs: [
        "Це Yifan, співзасновник Moneko. Побачив, що ви нещодавно скасували підписку, і вирішив запитати вас напряму.",
        "Чому ви вирішили перестати користуватися Moneko?",
        "Можете відповісти цілком відверто. Якщо щось дратувало, бракувало потрібної функції, було задорого чи просто недостатньо корисно, я хотів би про це знати.",
        "Якщо захочете дати Moneko ще один шанс, із задоволенням запропоную знижку 50%. Просто дайте відповідь на цей лист, і я все організую.",
      ],
    },
  },
  ur: {
    greeting: "السلام علیکم،",
    namedGreeting: "السلام علیکم {name}،",
    signature: "Moneko کا شریک بانی",
    welcome: {
      subject: "Moneko کے بارے میں ایک چھوٹا سا سوال",
      paragraphs: [
        "میں Yifan ہوں، Moneko کے شریک بانیوں میں سے ایک۔ دیکھا کہ آپ نے حال ہی میں شمولیت اختیار کی ہے تو سوچا سلام کر لوں۔",
        "ویسے، Moneko سے پہلے آپ اپنے پیسوں کا حساب رکھنے کے لیے کیا استعمال کرتے تھے؟",
        "اگر آزمانے کے لیے کچھ اور وقت چاہیے تو بتا دیجیے۔ میں خوشی سے آپ کی مفت آزمائشی مدت بڑھا دوں گا۔",
      ],
    },
    cancellation: {
      subject: "آپ کی Moneko سبسکرپشن کے بارے میں ایک چھوٹا سا سوال",
      paragraphs: [
        "میں Yifan ہوں، Moneko کا شریک بانی۔ دیکھا کہ آپ نے حال ہی میں سبسکرپشن منسوخ کی ہے تو سوچا آپ سے براہ راست پوچھ لوں۔",
        "آپ نے Moneko کا استعمال چھوڑنے کا فیصلہ کیوں کیا؟",
        "بے جھجھک بتائیے۔ اگر کوئی چیز پریشان کن تھی، کوئی سہولت کم تھی، قیمت زیادہ تھی یا بس اتنا فائدہ نہیں ہو رہا تھا تو میں جاننا چاہوں گا۔",
        "اگر آپ Moneko کو ایک اور موقع دینا چاہیں تو میں خوشی سے آپ کو 50% رعایت دوں گا۔ بس اس ای میل کا جواب دے دیجیے، باقی میں کر دوں گا۔",
      ],
    },
  },
  vi: {
    greeting: "Chào bạn,",
    namedGreeting: "Chào {name},",
    signature: "Đồng sáng lập Moneko",
    welcome: {
      subject: "Hỏi bạn một chút về Moneko",
      paragraphs: [
        "Mình là Yifan, một trong những người đồng sáng lập Moneko. Thấy bạn mới tham gia gần đây nên mình muốn gửi lời chào.",
        "Mình hơi tò mò, trước khi dùng Moneko bạn quản lý tiền bạc bằng cách nào?",
        "Nếu cần thêm thời gian dùng thử thì cứ nhắn mình nhé. Mình rất sẵn lòng gia hạn dùng thử miễn phí cho bạn.",
      ],
    },
    cancellation: {
      subject: "Hỏi bạn một chút về gói đăng ký Moneko",
      paragraphs: [
        "Mình là Yifan, đồng sáng lập Moneko. Thấy bạn vừa hủy gói đăng ký nên mình muốn hỏi trực tiếp.",
        "Điều gì khiến bạn quyết định ngừng dùng Moneko?",
        "Bạn cứ chia sẻ thật lòng nhé. Nếu có gì gây khó chịu, thiếu tính năng, giá hơi cao hay đơn giản là chưa đủ hữu ích, mình rất muốn biết.",
        "Nếu bạn muốn thử lại Moneko, mình sẵn lòng giảm giá 50% cho bạn. Chỉ cần trả lời email này, mình sẽ lo phần còn lại.",
      ],
    },
  },
  zh: {
    greeting: "你好，",
    namedGreeting: "{name}，你好，",
    signature: "Moneko 联合创始人",
    welcome: {
      subject: "想问你一个关于 Moneko 的小问题",
      paragraphs: [
        "我是 Yifan，Moneko 的联合创始人之一。看到你最近加入了 Moneko，就想来打个招呼。",
        "有点好奇，在用 Moneko 之前，你是怎么管理自己的钱的？",
        "如果还想多试用一阵子，跟我说一声就好。我很乐意帮你延长免费试用。",
      ],
    },
    cancellation: {
      subject: "想问问你取消 Moneko 订阅的原因",
      paragraphs: [
        "我是 Yifan，Moneko 的联合创始人。看到你最近取消了订阅，想直接问问你的想法。",
        "是什么让你决定不再使用 Moneko 了呢？",
        "可以直接说你的真实感受。如果有什么用着不顺手、缺少的功能、觉得太贵，或是单纯没那么实用，我都想听听。",
        "如果你愿意再试试 Moneko，我可以给你 50% 的折扣。直接回复这封邮件就好，我来帮你安排。",
      ],
    },
  },
  "zh-TW": {
    greeting: "你好，",
    namedGreeting: "{name}，你好，",
    signature: "Moneko 共同創辦人",
    welcome: {
      subject: "想問你一個關於 Moneko 的小問題",
      paragraphs: [
        "我是 Yifan，Moneko 的共同創辦人之一。看到你最近加入了 Moneko，就想來打個招呼。",
        "有點好奇，在用 Moneko 之前，你是怎麼管理自己的錢的？",
        "如果還想多試用一陣子，跟我說一聲就好。我很樂意幫你延長免費試用。",
      ],
    },
    cancellation: {
      subject: "想問問你取消 Moneko 訂閱的原因",
      paragraphs: [
        "我是 Yifan，Moneko 的共同創辦人。看到你最近取消了訂閱，想直接問問你的想法。",
        "是什麼讓你決定不再使用 Moneko 了呢？",
        "可以直接說你的真實感受。如果有什麼用起來不順手、缺少的功能、覺得太貴，或是單純沒那麼實用，我都想聽聽。",
        "如果你願意再試試 Moneko，我可以給你 50% 的折扣。直接回覆這封郵件就好，我來幫你安排。",
      ],
    },
  },
};

function resolveTranslation(
  preferredLanguage: unknown,
): FounderEmailTranslation {
  if (typeof preferredLanguage !== "string" || !preferredLanguage.trim()) {
    return english;
  }

  const parts = preferredLanguage.trim().replaceAll("_", "-").split("-");
  const primary = parts[0].toLowerCase();
  parts[0] = primary === "kr" ? "ko" : primary === "cn" ? "zh" : primary;

  try {
    const locale = new Intl.Locale(parts.join("-"));
    // Regions such as TW/HK/MO and explicit Hant keep Traditional Chinese.
    const key = locale.language === "zh" && locale.maximize().script === "Hant"
      ? "zh-TW"
      : locale.language;
    return translations[key] ?? english;
  } catch {
    return english;
  }
}

export function buildFounderFollowupEmail(
  event: "welcome" | "cancellation",
  name: string,
  preferredLanguage: unknown,
): { subject: string; bodyText: string } {
  const translation = resolveTranslation(preferredLanguage);
  const message = translation[event];
  const trimmedName = name.trim();
  const greeting = trimmedName
    ? translation.namedGreeting.replace("{name}", () => trimmedName)
    : translation.greeting;

  return {
    subject: message.subject,
    bodyText: [
      greeting,
      ...message.paragraphs,
      `Yifan\n${translation.signature}`,
    ].join("\n\n"),
  };
}
