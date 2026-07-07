import type { HelpArticle } from "../../types";

export const appLockArticle: HelpArticle = {
  id: "app-lock",
  number: "6.1",
  slug: "protecting-moneko-with-app-lock",
  title: "Protecting Moneko with App Lock",
  description:
    "Learn how to secure your financial data in Moneko using a 6-digit passcode and biometrics like FaceID or Fingerprint.",
  categoryId: "security-privacy",
  readTime: 3,
  keywords: [
    "app lock",
    "biometrics",
    "faceid",
    "touchid",
    "passcode",
    "secure app",
    "privacy",
  ],
  faqItems: [
    {
      question: "What is App Lock?",
      answer:
        "App Lock requires you to enter a passcode or use biometrics (FaceID/Fingerprint) whenever you open Moneko or return to it after a period of inactivity.",
    },
    {
      question: "Can I use FaceID or TouchID?",
      answer:
        "Yes, Moneko supports native biometric authentication on both iOS and Android devices.",
    },
    {
      question: "What happens if I forget my passcode?",
      answer:
        "For security, if you forget your passcode and cannot use biometrics, you will need to reinstall the app. Since your data is synced securely to the cloud, you can log back into your account after reinstallation.",
    },
    {
      question: "Does App Lock protect my data from other people using my phone?",
      answer:
        "Yes. Once enabled, Moneko will be locked whenever the app is closed or in the background.",
    },
  ],
  howToSteps: [
    {
      name: "Open Security Settings",
      text: "Go to Moneko Settings and tap 'App Lock'.",
    },
    {
      name: "Create a Passcode",
      text: "Choose a secure 6-digit passcode. You will be asked to confirm it.",
    },
    {
      name: "Enable Biometrics",
      text: "If your device supports it, you can choose to enable FaceID or Fingerprint for faster access.",
    },
  ],
  content: `# Protecting Moneko with App Lock

Moneko handles your most sensitive financial information. To ensure your data remains private even if someone else uses your device, we've built **App Lock**.

---

## How App Lock Works

When App Lock is enabled:
1. **Passcode Required**: You must enter a 6-digit passcode to access the app.
2. **Biometric Support**: On supported devices, you can use **FaceID**, **TouchID**, or **Android Fingerprint** to unlock Moneko instantly.
3. **Inactivity Timeout**: The app will automatically lock after a few minutes of inactivity or as soon as you switch to another app.
4. **Visual Privacy**: Moneko hides your financial dashboard in the app switcher (multitasking view) when App Lock is active.

---

## Setting Up App Lock

1. Open **Moneko**.
2. Tap the **three-dot menu** → **Settings**.
3. Scroll down to **Security** and tap **App Lock**.
4. Tap **Enable App Lock**.
5. **Create your Passcode**: Enter a 6-digit code. Avoid simple codes like "123456" or "000000".
6. **Confirm Passcode**: Enter the same code again.
7. **Biometric Opt-in**: If prompted, tap "Allow" to use FaceID or Fingerprint.

---

## Managing Your Security

Once enabled, you can return to the App Lock settings to:
- **Change Passcode**: Update your 6-digit code.
- **Toggle Biometrics**: Turn FaceID/Fingerprint on or off.
- **Turn Off App Lock**: Disables the lock entirely (requires your current passcode).

---

## Security Best Practices

- **Never Share Your Passcode**: Your Moneko passcode should be unique and not shared with others.
- **Enable Biometrics**: It's faster and more secure than typing a code in public.
- **Keep Your Device Secure**: App Lock is an extra layer of defense, but it works best when your entire phone is protected by a system-level lock screen.
`,
};
