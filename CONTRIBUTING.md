# Внесок у J.A.R.V.I.S. 🤝

Дякуємо за бажання покращити JARVIS! Це open-source асистент майстра — будь-хто може його допрацьовувати.

## 🚀 Швидкий старт (розробка)

**Потрібно:** Node.js 18+

```bash
# 1. Клонувати
git clone https://github.com/cardmoney55-gif/jarvis-maker-assistant.git
cd jarvis-maker-assistant

# 2. Залежності
npm install

# 3. Ключ Gemini (безкоштовний: https://aistudio.google.com/apikey)
#    Створи файл .env:
echo 'GEMINI_API_KEY="ваш_ключ"' > .env

# 4. Запустити як десктоп-програму
npm run electron:dev
```

> Без ключа застосунок працює в обмеженому режимі (3D-голограми, нейроголос — працюють локально без ключа).

## 🗂 Структура проєкту

```
electron/main.cjs   запуск бекенду + вікно Electron
server.ts           Express API: чат, зір, пошук деталей, навчання, TTS
memory.ts           векторна памʼять (RAG) — самонавчання
websearch.ts        власний безкоштовний веб-пошук (DuckDuckGo + reader)
skills.ts           система навичок (function-calling)
tts.ts              нейроголос (Piper / XTTS) з фолбеком
src/                React UI
  components/        ядро, камера, схема пайки, 3D-голограма
  hooks/             живий режим (VAD + переривання)
```

## ➕ Як додати нову навичку

Навички — це здібності, які JARVIS викликає автономно. Додати — **один запис** у [`skills.ts`](skills.ts):

```ts
{
  name: "my_skill",
  description: "Опис для моделі — коли застосовувати",
  parameters: { type: Type.OBJECT, properties: { /* ... */ } },
  ui: { label: "Моя навичка", icon: "🔧", hint: "що робить" },
  handler: async (args, ctx) => {
    return { result: { /* дані для відповіді */ } };
    // або clientAction для дії в UI (напр. показати 3D)
  },
}
```

## 🎙 Голос / нейроголос

- TTS — pluggable (`tts.ts`): Piper (локальний), XTTS (клон), або системний голос.
- Налаштування — через env (див. README).

## 📋 Правила внеску

1. **Гілка:** створюй окрему гілку від `main` (`feature/назва`).
2. **Стиль:** дотримуйся наявного стилю коду (TypeScript, коментарі українською/англійською — як у файлі поруч).
3. **Перевірка:** перед PR запусти `npm run lint` (перевірка типів) — має бути без помилок.
4. **Секрети:** ніколи не коміт `.env` чи ключі (вони у `.gitignore`).
5. **PR:** опиши, що змінив і навіщо. Невеликі цілеспрямовані PR — найкраще.

## 💡 Ідеї для внеску

- Нові навички (керування GPIO/платами, калькулятори, конвертери)
- Локальний Whisper (офлайн-розпізнавання мови)
- Wake-word «Джарвіс»
- Більше 3D-моделей компонентів
- Покрокові 3D-інструкції пайки
- Переклади інтерфейсу

Питання? Відкрий [issue](https://github.com/cardmoney55-gif/jarvis-maker-assistant/issues). Дякуємо! 🛠
