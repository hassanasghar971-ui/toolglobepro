import type { Tool } from "@/lib/types";

export const passwordGeneratorTool: Tool = {
  slug: "password-generator",
  name: "Secure Password Generator",
  description:
    "Create strong random passwords and passphrases in your browser. Custom length up to 128, bulk generation, entropy meter. Nothing is stored or sent.",
  category: "security",
  icon: "key",
  keywords: [
    "password generator",
    "strong password generator",
    "random password generator",
    "secure password",
    "passphrase generator",
    "generate password online",
    "password strength checker",
    "password entropy",
    "bulk password generator",
    "16 character password",
  ],
  seoTitle: "Free Secure Password Generator: Strong Random Passwords & Passphrases",
  seoDescription:
    "Generate strong, random passwords or memorable passphrases right in your browser. Choose length up to 128, exclude look-alike characters and see the entropy. Private and free.",
  article: [
    {
      heading: "Why a random password still matters",
      paragraphs: [
        "Most account breaches don't involve a hacker guessing cleverly. They involve a password that was reused, short, or built from something personal, and an attacker with a list of leaked credentials and a lot of patience. A random password breaks that pattern. It has no meaning for anyone to guess, and it only works on the one site you made it for.",
        "This generator builds passwords with your browser's cryptographically secure random number source, the same class of randomness used for encryption keys. It doesn't use a predictable shortcut, and it avoids the subtle bias you get when random numbers are squeezed into a smaller range. Everything happens on your device. The password never touches our servers, because we don't run any for this tool.",
      ],
    },
    {
      heading: "Password or passphrase: which should you pick?",
      paragraphs: [
        "A random character password like k7#Vq2!mZp9x packs a lot of strength into few characters. It's the right choice for anything a password manager will remember for you, which should be almost everything. Aim for at least 16 characters, and go longer for email, banking and your password manager itself.",
        "A passphrase strings together random words, like maple-ginger-harbor-violin. It's longer, but far easier to type and remember, which makes it ideal for the few secrets you have to know by heart: your device login, your password manager's master password and your disk encryption key. The key is that the words are picked randomly by the tool. A phrase you invent yourself, or a famous quote, is much weaker than it feels.",
      ],
    },
    {
      heading: "How to use the settings",
      paragraphs: [
        "Length does the heavy lifting. Each extra character multiplies the number of possibilities, so moving from 12 to 16 characters makes a password vastly harder to crack, far more than adding one more symbol would. Character types still help, so keep uppercase, lowercase, numbers and symbols on unless a site refuses certain ones.",
        "Some sites do refuse. If a system rejects particular symbols, type them into the exclude box and the generator will skip them. If you need to read a password aloud or copy it from a printed sheet, tick the option that removes look-alike characters such as I, l, 1, O and 0.",
        "Need several at once? Choose a batch size and you can copy the lot or download a plain text file, which is useful for provisioning accounts or testing.",
      ],
    },
    {
      heading: "Reading the strength meter",
      paragraphs: [
        "The meter shows entropy in bits, an estimate of how many guesses an attacker would need on average. Roughly, under 36 bits is weak, 60 or more is strong for online accounts and 128 bits is overkill-level. The crack-time line assumes an attacker with ten billion guesses per second against a leaked, fast-hashed password, which is a deliberately pessimistic scenario. Real sites that use slow hashing and rate limits are much tougher, but planning for the worst case is sensible.",
        "Recent guidance from NIST puts length ahead of complexity rules and says you shouldn't be forced to change passwords on a schedule unless there's evidence of a breach. In practice that means a long, unique password per account, stored in a password manager, with two-factor authentication switched on wherever it's offered.",
      ],
    },
    {
      heading: "Good habits after you generate",
      paragraphs: [
        "Paste the password straight into your password manager or the sign-up form, then clear your clipboard or copy something harmless over it. Don't email passwords to yourself or keep them in a notes app without encryption. If a service tells you it was breached, change that password at once and check whether you reused it anywhere else.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is this password generator safe to use?",
      answer:
        "Yes. Passwords are created in your browser using the Web Crypto API, a cryptographically secure random source. They're never sent to a server, logged or stored, so nobody but you ever sees them.",
    },
    {
      question: "How long should my password be?",
      answer:
        "Use at least 16 random characters for most accounts and 20 or more for email, banking and your password manager. If you only have to remember it, a passphrase of six or seven random words is a good alternative.",
    },
    {
      question: "What is entropy and why does it matter?",
      answer:
        "Entropy, measured in bits, estimates how unpredictable a password is. Every extra bit doubles the number of guesses an attacker needs. Higher is better, and 60 bits or more is a solid target for online accounts.",
    },
    {
      question: "Are passphrases as secure as random passwords?",
      answer:
        "They can be, if the words are chosen randomly and there are enough of them. Each word from this tool's list adds roughly nine bits, so a six-word passphrase is reasonable and seven or eight is strong. Use more words for important accounts.",
    },
    {
      question: "Why exclude look-alike characters?",
      answer:
        "Characters such as I, l, 1, O and 0 are easy to confuse when reading or typing a password by hand. Removing them slightly shrinks the pool, so add a character or two to the length to make up for it.",
    },
    {
      question: "Should I use a password manager?",
      answer:
        "Yes. A manager lets you use a different long random password for every account without memorizing any of them. Protect it with a strong passphrase and two-factor authentication.",
    },
    {
      question: "Can a website reject my generated password?",
      answer:
        "Some sites limit length or block certain symbols. Use the length slider and the exclude box to match their rules, or turn symbols off and increase the length instead.",
    },
    {
      question: "Does this tool work offline?",
      answer:
        "Once the page has loaded, generation needs no network connection, because everything runs locally in your browser.",
    },
  ],
};

export default passwordGeneratorTool;
