/**
 * Claude draft — owner review before publishing.
 *
 * 18 draft lessons (3 per tier), 10 questions each. Text is `[uz, ru, en]`; the correct answer
 * is written first and lesson-seed.rules.ts places it. Synthetic content only: no real people,
 * no phone numbers except the public emergency number 112.
 */
import type { LessonSource } from './lesson-seed.rules.js';

export const lessonSources: readonly LessonSource[] = [
  // ───────────────────────── Tier 1 ─────────────────────────
  {
    tierKey: '1',
    icon: 'compass',
    title: ['Yoʻnalish asoslari', 'Основы навигации', 'Navigation basics'],
    questions: [
      {
        prompt: [
          'Sayohatdan oldin marshrutingiz haqida eng muhim ish nima?',
          'Что важнее всего сделать с планом маршрута перед походом?',
          'Before a hike, what is the most important thing to do with your route plan?',
        ],
        hint: [
          'Kechiksangiz, kim xavotir bildiradi?',
          'Кто поднимет тревогу, если вы опоздаете?',
          'Who would raise the alarm if you were late?',
        ],
        answer: [
          'Ishonchli odamga marshrut va qaytish vaqtini aytish',
          'Сообщить надёжному человеку маршрут и время возвращения',
          'Tell a trusted person your route and return time',
        ],
        wrong: [
          ['Hech kimga aytmaslik', 'Никому не говорить', 'Keep it to yourself'],
          [
            'Faqat qaytgandan keyin ijtimoiy tarmoqqa yozish',
            'Написать в соцсетях только после возвращения',
            'Post it online only after you return',
          ],
          [
            'Marshrutni yoʻlda hal qilish',
            'Выбрать маршрут уже на тропе',
            'Decide the route on the trail',
          ],
        ],
        explanation: [
          'Uyda kimdir qayerga borganingizni va qachon qaytishingizni bilishi kerak. Kechiksangiz, u 112 ga qoʻngʻiroq qilib, qayerdan qidirishni aytadi.',
          'Кто-то дома должен знать, куда вы идёте и когда вернётесь. Если вы опоздаете, он позвонит 112 и скажет, где искать.',
          'Someone at home should know where you are going and when you will be back. If you are late, they can call 112 and say where to look.',
        ],
        wrongExplanation: [
          'Rejangizni hech kim bilmasa, sizni qayerdan qidirishni ham hech kim bilmaydi. Chiqishdan oldin marshrutni ulashing.',
          'Если никто не знает план, никто не знает, где искать. Делитесь маршрутом до выхода.',
          'If nobody knows your plan, nobody knows where to look. Share your route and return time before you leave.',
        ],
      },
      {
        prompt: [
          'Telefoningizda xarita bor. Yana nima olish kerak?',
          'У вас карта в телефоне. Что ещё стоит взять?',
          'Your phone has the map. What else should you carry?',
        ],
        answer: [
          'Qogʻoz xarita, kompas va zaryadlangan powerbank',
          'Бумажную карту, компас и заряженный пауэрбанк',
          'A paper map, a compass and a charged power bank',
        ],
        wrong: [
          [
            'Hech narsa, telefon yetarli',
            'Ничего, телефона достаточно',
            'Nothing, the phone is enough',
          ],
          [
            'Zaryadsiz ikkinchi telefon',
            'Второй телефон без зарядки',
            'A second phone with no charge',
          ],
          [
            'Choʻqqining bosma surati',
            'Распечатанное фото вершины',
            'A printed photo of the peak',
          ],
        ],
        explanation: [
          'Telefon oʻchib qolishi, sinishi yoki aloqa yoʻqolishi mumkin. Qogʻoz xarita, kompas va powerbank sizni yoʻlda ushlab turadi.',
          'Телефон может сесть, сломаться или потерять сигнал. Бумажная карта, компас и пауэрбанк — надёжная страховка.',
          'Phones die, break and lose signal. A paper map, a compass and a power bank keep you on track.',
        ],
        wrongExplanation: [
          'Faqat telefonga tayanish xavfli. Qogʻoz zaxira va qoʻshimcha quvvat oling.',
          'Полагаться только на телефон рискованно. Возьмите бумажную запасную карту и запас энергии.',
          'A phone alone is a single point of failure. Bring a paper backup and spare power.',
        ],
      },
      {
        prompt: [
          'Adashganingizni tushundingiz. Avval nima qilasiz?',
          'Вы поняли, что заблудились. Что сделать в первую очередь?',
          'You realise you are lost. What should you do first?',
        ],
        hint: [
          'STOP soʻzini eslang: toʻxta, oʻyla, kuzat, rejala.',
          'Вспомните слово STOP: стоп, подумай, осмотрись, спланируй.',
          'Remember STOP: Stop, Think, Observe, Plan.',
        ],
        answer: [
          'Toʻxtash, tinchlanish va oʻylab olish',
          'Остановиться, успокоиться и подумать',
          'Stop, stay calm and think',
        ],
        wrong: [
          [
            'Soʻqmoqni topish uchun tezroq yurish',
            'Идти быстрее, чтобы найти тропу',
            'Walk faster to find the trail',
          ],
          [
            'Guruhni boʻlib, har tomonga qidirish',
            'Разделиться и искать в разные стороны',
            'Split up and search in all directions',
          ],
          [
            'Istalgan soy boʻylab pastga tushish',
            'Спускаться вдоль любого ручья',
            'Head downhill along any stream',
          ],
        ],
        explanation: [
          'Vahima sizni marshrutdan yanada uzoqlashtiradi. Toʻxtang, atrofga qarang, oxirgi tanish joyni eslang, keyin qaror qiling.',
          'Паника уводит дальше от маршрута. Остановитесь, осмотритесь, вспомните последнее знакомое место и только потом решайте.',
          'Panic takes you further from the route. Stop, look around, recall the last place you knew, then decide.',
        ],
        wrongExplanation: [
          'Shoshilish odatda vaziyatni yomonlashtiradi. Avval toʻxtang, keyin reja tuzing.',
          'Спешка обычно всё ухудшает. Сначала остановитесь, потом составьте план.',
          'Rushing usually makes things worse. Stop first, then make a plan.',
        ],
      },
      {
        prompt: [
          'Topografik xaritada gorizontallar bir-biriga yaqin boʻlsa, bu nimani bildiradi?',
          'Что значит, если горизонтали на топокарте идут близко друг к другу?',
          'On a topographic map, what do contour lines close together mean?',
        ],
        answer: ['Tik qiyalik', 'Крутой склон', 'Steep ground'],
        wrong: [
          ['Tekis joy', 'Ровное место', 'Flat ground'],
          ['Daryo', 'Река', 'A river'],
          ['Avtomobil yoʻli', 'Автодорога', 'A road'],
        ],
        explanation: [
          'Har bir gorizontal bir xil balandlikni koʻrsatadi. Chiziqlar zich boʻlsa, balandlik tez oʻzgaradi — qiyalik tik.',
          'Каждая горизонталь — одна высота. Чем плотнее линии, тем быстрее меняется высота, то есть склон круче.',
          'Each contour line marks one height. Lines close together mean the height changes quickly, so the slope is steep.',
        ],
        wrongExplanation: [
          'Zich chiziqlar — tik joy. Chiziqlar orasi keng boʻlsa, joy qiya emas.',
          'Плотные линии — круто. Широкие промежутки — пологий рельеф.',
          'Close lines mean steep terrain. Wide gaps between lines mean gentle ground.',
        ],
      },
      {
        prompt: [
          'Quyosh qaysi tomondan chiqadi?',
          'С какой стороны восходит солнце?',
          'Where does the sun rise?',
        ],
        hint: [
          'Ertalabki yorugʻlikni eslang.',
          'Вспомните утренний свет.',
          'Think about the morning light.',
        ],
        answer: ['Sharqdan', 'На востоке', 'In the east'],
        wrong: [
          ['Gʻarbdan', 'На западе', 'In the west'],
          ['Shimoldan', 'На севере', 'In the north'],
          ['Janubdan', 'На юге', 'In the south'],
        ],
        explanation: [
          'Quyosh sharqdan chiqib, gʻarbga botadi. Tushda u janubda boʻladi. Bu taxminiy tekshiruv, kompas oʻrnini bosmaydi.',
          'Солнце встаёт на востоке и садится на западе, в полдень оно на юге. Это грубая проверка, а не замена компасу.',
          'The sun rises in the east and sets in the west; at midday it is in the south. It is a rough check, not a replacement for a compass.',
        ],
        wrongExplanation: [
          'Quyosh sharqdan chiqadi. Undan xarita va kompas bilan birga taxminiy yoʻnalish uchun foydalaning.',
          'Солнце восходит на востоке. Используйте его как грубый ориентир вместе с картой и компасом.',
          'The sun rises in the east. Use it as a rough check together with your map and compass.',
        ],
      },
      {
        prompt: [
          'Rejada boʻlmagan ayri yoʻlga yetdingiz. Nima qilasiz?',
          'Вы вышли к развилке, которой нет в плане. Что делать?',
          'You reach a fork that is not in your plan. What do you do?',
        ],
        answer: [
          'Toʻxtab, xarita, kompas yoki GPS trekni tekshirish',
          'Остановиться и сверить карту, компас или GPS-трек',
          'Stop and check the map, compass or GPS track',
        ],
        wrong: [
          [
            'Kengroq yoʻlni tanlash',
            'Выбрать тропу пошире',
            'Take the wider path',
          ],
          [
            'Yuqoriga ketgan yoʻlni tanlash',
            'Выбрать тропу, идущую вверх',
            'Take the path that goes up',
          ],
          [
            'Begona izlar ortidan yurish',
            'Идти по чужим следам',
            "Follow other people's footprints",
          ],
        ],
        explanation: [
          'Keng yoki koʻp yurilgan yoʻl koʻpincha yaylov yoki qishloqqa olib boradi. Tanlashdan oldin qayerdaligingizni aniqlang.',
          'Широкие и натоптанные тропы часто ведут к пастбищам или сёлам, а не по вашему маршруту. Сначала определите, где вы.',
          'Wide or busy paths often lead to pastures or villages, not along your route. Check where you are before you choose.',
        ],
        wrongExplanation: [
          'Ayri yoʻlda taxmin qilish — adashishning asosiy sababi. Avval yoʻnalishni tekshiring.',
          'Гадать на развилке — частая причина, почему люди теряются. Сначала проверьте навигацию.',
          'Guessing at a junction is how people get lost. Check your navigation first.',
        ],
      },
      {
        prompt: [
          'Koʻtarilayotganda nega tez-tez orqaga qarash kerak?',
          'Зачем на подъёме часто оглядываться назад?',
          'Why should you look back often on the way up?',
        ],
        hint: [
          'Qaytish yoʻli boshqacha koʻrinadi.',
          'Обратный путь выглядит иначе.',
          'The way back looks different.',
        ],
        answer: [
          'Tushishda yoʻl tanish koʻrinishi uchun',
          'Чтобы на спуске дорога выглядела знакомой',
          'So the way down looks familiar',
        ],
        wrong: [
          [
            'Kimdir kuzatayotganini bilish uchun',
            'Чтобы проверить, не идёт ли кто-то следом',
            'To check if someone is following you',
          ],
          [
            'Bu nafas olishga yordam beradi',
            'Это помогает дышать',
            'It helps you breathe',
          ],
          [
            'Hech qanday sababi yoʻq',
            'Никакой причины нет',
            'There is no reason',
          ],
        ],
        explanation: [
          'Yoʻl qaytishda boshqacha koʻrinadi. Ayri yoʻllar va moʻljallarga orqadan qarab qoʻysangiz, tushishda ularni taniysiz.',
          'На обратном пути тропа выглядит иначе. Оглядывайтесь на развилках и ориентирах — так вы узнаете их на спуске.',
          'The trail looks different on the way back. Looking back at junctions and landmarks helps you recognise them on the descent.',
        ],
        wrongExplanation: [
          'Yoʻllar teskari tomondan boshqacha koʻrinadi. Pastga qaytish uchun moʻljallarni eslab qoling.',
          'С другой стороны тропы выглядят иначе. Запоминайте ориентиры для спуска.',
          'Paths look different from the other side. Remember landmarks so you can find your way down.',
        ],
      },
      {
        prompt: [
          'Oflayn xaritani qachon yuklab olish kerak?',
          'Когда нужно скачать офлайн-карту?',
          'When should you download an offline map?',
        ],
        answer: [
          'Uyda, sayohatdan oldin',
          'Дома, до поездки',
          'At home, before the trip',
        ],
        wrong: [
          ['Aloqa yoʻqolganda', 'Когда пропадёт связь', 'When you lose signal'],
          ['Choʻqqida', 'На вершине', 'At the summit'],
          [
            'Faqat adashib qolsangiz',
            'Только если заблудитесь',
            'Only if you get lost',
          ],
        ],
        explanation: [
          'Togʻ vodiylarida mobil aloqa koʻpincha zaif yoki umuman yoʻq. Xarita va treklarni uyda saqlab oling.',
          'В горных долинах связь часто слабая или её нет вовсе. Скачайте карты и треки дома.',
          'Mobile signal in mountain valleys is often weak or missing. Save maps and tracks at home.',
        ],
        wrongExplanation: [
          'Aloqasiz hech narsa yuklab boʻlmaydi. Xaritani chiqishdan oldin saqlang.',
          'Без связи ничего не скачать. Сохраните карту до выхода.',
          'Without signal you cannot download anything. Save the map before you leave.',
        ],
      },
      {
        prompt: [
          'Telefon quvvatini favqulodda holat uchun qanday saqlaysiz?',
          'Как сберечь заряд телефона на случай ЧП?',
          'How do you save phone battery for an emergency?',
        ],
        hint: [
          'Sovuq va aloqa qidirish quvvatni tez yeydi.',
          'Холод и поиск сети быстро сажают батарею.',
          'Cold and searching for signal both drain power.',
        ],
        answer: [
          'Parvoz rejimini yoqib, telefonni issiq saqlash',
          'Включить режим полёта и держать телефон в тепле',
          'Use airplane mode and keep the phone warm',
        ],
        wrong: [
          [
            'Ekranni toʻliq yorqin qilish',
            'Держать яркость экрана на максимуме',
            'Keep the screen at full brightness',
          ],
          [
            'Kun boʻyi musiqa tinglash',
            'Слушать музыку онлайн весь день',
            'Stream music all day',
          ],
          [
            'Aloqani doim qidirib turish',
            'Постоянно искать сеть',
            'Keep searching for signal',
          ],
        ],
        explanation: [
          'Aloqa qidirish va sovuq batareyani tez tugatadi. Parvoz rejimi va ichki choʻntak quvvatni favqulodda qoʻngʻiroq uchun saqlaydi.',
          'Поиск сети и холод быстро разряжают батарею. Режим полёта и внутренний карман сохранят заряд для экстренного звонка.',
          'Searching for signal and cold drain the battery fast. Airplane mode and a warm inner pocket save power for an emergency call.',
        ],
        wrongExplanation: [
          'Quvvatni tejang: parvoz rejimi, past yorqinlik, telefonni tanangizga yaqin tuting.',
          'Берегите заряд: режим полёта, низкая яркость, телефон ближе к телу.',
          'Save power: airplane mode, low brightness and the phone close to your body.',
        ],
      },
      {
        prompt: [
          'Oʻzbekistonda favqulodda holatda qaysi raqamga qoʻngʻiroq qilinadi?',
          'По какому номеру звонить в экстренной ситуации в Узбекистане?',
          'Which number do you call in an emergency in Uzbekistan?',
        ],
        answer: ['112', '112', '112'],
        wrong: [
          ['911', '911', '911'],
          ['999', '999', '999'],
          ['555', '555', '555'],
        ],
        explanation: [
          '112 — yagona favqulodda raqam. Nima boʻlganini, qayerdaligingizni va necha kishiga yordam kerakligini ayting.',
          '112 — единый номер экстренных служб. Скажите, что случилось, где вы и скольким людям нужна помощь.',
          '112 is the single emergency number. Say what happened, where you are and how many people need help.',
        ],
        wrongExplanation: [
          'Oʻzbekistonda favqulodda raqam — 112. Uni saqlab qoʻying va joylashuvingizni ayta oling.',
          'В Узбекистане экстренный номер — 112. Сохраните его и будьте готовы назвать своё место.',
          'In Uzbekistan the emergency number is 112. Save it and be ready to give your location.',
        ],
      },
    ],
  },
  {
    tierKey: '1',
    icon: 'leaf',
    title: ['Iz qoldirmaslik', 'Не оставляй следов', 'Leave no trace'],
    questions: [
      {
        prompt: [
          'Piknikdan keyin qolgan ovqat qoldiqlarini nima qilasiz?',
          'Что делать с остатками еды после перекуса?',
          'What do you do with food scraps after a picnic?',
        ],
        hint: [
          'Hayvonlar odamlar ovqatiga oʻrganib qoladi.',
          'Животные привыкают к человеческой еде.',
          'Animals get used to human food.',
        ],
        answer: [
          'Hammasini olib ketish',
          'Унести всё с собой',
          'Pack them all out',
        ],
        wrong: [
          [
            'Butalar ostiga tashlash',
            'Выбросить под кусты',
            'Throw them under a bush',
          ],
          [
            'Hayvonlar uchun qoldirish',
            'Оставить животным',
            'Leave them for animals',
          ],
          [
            'Tosh ostiga yashirish',
            'Спрятать под камень',
            'Hide them under a rock',
          ],
        ],
        explanation: [
          'Olma poʻsti ham togʻda yillab chirimaydi va hayvonlarni odamlarga yaqinlashtiradi. Hamma narsani paketga solib olib keting.',
          'Даже кожура яблока в горах долго не разлагается и приманивает животных к людям. Унесите всё в пакете.',
          'Even apple peel takes a long time to break down in the mountains and draws animals to people. Pack everything out in a bag.',
        ],
        wrongExplanation: [
          'Togʻda faqat iz qoldiring, axlat emas. Qoldiqlarni olib keting.',
          'В горах оставляйте только следы, а не мусор. Уносите остатки с собой.',
          'Leave only footprints, not leftovers. Take every scrap home.',
        ],
      },
      {
        prompt: [
          'Soʻqmoq loy boʻlib ketgan. Qayerdan yurasiz?',
          'Тропа раскисла от грязи. Где идти?',
          'The trail is muddy. Where do you walk?',
        ],
        answer: [
          'Soʻqmoqning oʻzidan, loy orqali',
          'По самой тропе, прямо через грязь',
          'On the trail itself, through the mud',
        ],
        wrong: [
          ['Yonidagi oʻt ustidan', 'По траве рядом', 'On the grass beside it'],
          [
            'Yangi yoʻl ochib',
            'Протоптать новую тропу',
            'Make a new path around it',
          ],
          [
            'Yonbagʻirdan toʻgʻri yuqoriga',
            'Напрямик вверх по склону',
            'Straight up the slope',
          ],
        ],
        explanation: [
          'Loydan aylanib oʻtish soʻqmoqni kengaytiradi va oʻsimliklarni nobud qiladi. Yaxshi poyabzal kiyib, soʻqmoqdan yuring.',
          'Обходы грязи расширяют тропу и губят растения. Наденьте хорошую обувь и идите по тропе.',
          'Walking around mud widens the trail and kills plants. Wear good boots and stay on the path.',
        ],
        wrongExplanation: [
          'Soʻqmoqdan chiqish eroziyani kuchaytiradi. Hatto loy boʻlsa ham soʻqmoqda qoling.',
          'Сход с тропы усиливает эрозию. Даже в грязь держитесь тропы.',
          'Leaving the trail speeds up erosion. Stay on it, even when it is muddy.',
        ],
      },
      {
        prompt: [
          'Chodirni suvdan qancha uzoqda tikish kerak?',
          'Как далеко от воды ставить палатку?',
          'How far from water should you pitch your tent?',
        ],
        hint: ['Taxminan 70 qadam.', 'Примерно 70 шагов.', 'About 70 steps.'],
        answer: ['Kamida 60 metr', 'Не меньше 60 метров', 'At least 60 metres'],
        wrong: [
          [
            'Toʻgʻridan-toʻgʻri qirgʻoqda',
            'Прямо на берегу',
            'Right on the bank',
          ],
          ['5 metr', '5 метров', '5 metres'],
          ['Farqi yoʻq', 'Неважно', 'It does not matter'],
        ],
        explanation: [
          'Qirgʻoq oʻsimliklari nozik, hayvonlar esa suvga keladi. Bundan tashqari, suv bahorda yoki yomgʻirdan keyin tez koʻtarilishi mumkin.',
          'Прибрежные растения хрупкие, а животные ходят к воде на водопой. К тому же весной и после дождя вода быстро поднимается.',
          'Bank plants are fragile and animals come to drink. Water can also rise fast in spring or after rain.',
        ],
        wrongExplanation: [
          'Suvdan kamida 60 metr uzoqda turing: tabiat uchun ham, xavfsizlik uchun ham.',
          'Держитесь не ближе 60 метров от воды — ради природы и ради безопасности.',
          'Camp at least 60 metres from water, for nature and for your own safety.',
        ],
      },
      {
        prompt: [
          'Tabiatda hojatga borish kerak. Toʻgʻri yoʻl qaysi?',
          'Нужно в туалет на природе. Как правильно?',
          'You need the toilet outdoors. What is the right way?',
        ],
        answer: [
          'Suvdan uzoqda 15–20 sm chuqurcha qazib, koʻmish',
          'Выкопать ямку 15–20 см вдали от воды и закопать',
          'Dig a 15–20 cm hole far from water and bury it',
        ],
        wrong: [
          ['Soy yoniga borish', 'Сходить у ручья', 'Go next to a stream'],
          ['Tosh bilan berkitish', 'Прикрыть камнем', 'Cover it with a stone'],
          ['Qogʻozni yoqib yuborish', 'Сжечь бумагу', 'Burn the toilet paper'],
        ],
        explanation: [
          'Kamida 60 metr suvdan, soʻqmoq va lagerdan uzoqda chuqurcha qazing. Qogʻozni paketda olib keting.',
          'Ямку копайте не ближе 60 м от воды, тропы и лагеря. Бумагу уносите в пакете.',
          'Dig at least 60 m from water, trails and camp. Pack the paper out in a bag.',
        ],
        wrongExplanation: [
          'Ochiq qoldirilgan chiqindi suvni ifloslantiradi. Qogʻozni yoqish esa yongʻin chiqarishi mumkin.',
          'Открытые отходы загрязняют воду, а сжигание бумаги может вызвать пожар.',
          'Uncovered waste pollutes water, and burning paper can start a wildfire.',
        ],
      },
      {
        prompt: [
          'Chiroyli lola koʻrdingiz. Nima qilasiz?',
          'Вы увидели красивый тюльпан. Что делать?',
          'You see a beautiful wild tulip. What do you do?',
        ],
        hint: [
          'Undan keyingi sayyohlar ham bahramand boʻlsin.',
          'Пусть им полюбуются и те, кто придёт после.',
          'Let the next hikers enjoy it too.',
        ],
        answer: [
          'Suratga olib, joyida qoldirish',
          'Сфотографировать и оставить на месте',
          'Take a photo and leave it',
        ],
        wrong: [
          ['Guldasta uchun uzish', 'Сорвать на букет', 'Pick it for a bouquet'],
          [
            'Piyozi bilan qazib olish',
            'Выкопать с луковицей',
            'Dig up the bulb',
          ],
          [
            'Bittasini olsa boʻladi',
            'Один сорвать можно',
            'Picking just one is fine',
          ],
        ],
        explanation: [
          'Yovvoyi lolalarning ayrim turlari kamyob va muhofaza qilinadi. Gul joyida qolsa, keyingi yili yana ochiladi.',
          'Некоторые виды диких тюльпанов редкие и охраняются. Оставленный цветок зацветёт и на следующий год.',
          'Some wild tulip species are rare and protected. A flower left in place blooms again next year.',
        ],
        wrongExplanation: [
          'Bitta gul ham koʻp odam uzsa, butun maydonni yoʻq qiladi. Faqat suratga oling.',
          'Если каждый сорвёт по одному, поляна исчезнет. Только фото.',
          'If everyone picks just one, the meadow disappears. Photos only.',
        ],
      },
      {
        prompt: [
          'Gulxan haqida qaysi gap toʻgʻri?',
          'Что верно про костёр?',
          'Which is true about campfires?',
        ],
        answer: [
          'Quruq mavsumda va shamolda gulxan yoqmaslik',
          'Не разводить костёр в сухой сезон и в ветер',
          'No fires in the dry season or in wind',
        ],
        wrong: [
          [
            'Tirik daraxt shoxlarini sindirib yoqish',
            'Ломать ветки живых деревьев',
            'Break branches off living trees',
          ],
          [
            'Oʻtli joyda yoqish yumshoqroq',
            'Разводить на траве — мягче',
            'Build it on grass, it is softer',
          ],
          [
            'Ketishda choʻgʻni oʻzi oʻchadi',
            'Угли сами потухнут, когда уйдёте',
            'Embers go out by themselves when you leave',
          ],
        ],
        explanation: [
          'Yozda togʻ yonbagʻirlari juda quruq. Gas gorelkadan foydalaning. Gulxan yoqsangiz, eski oʻchoqda qiling va choʻgʻni suv bilan toʻliq oʻchiring.',
          'Летом склоны очень сухие. Лучше газовая горелка. Если костёр всё же нужен — на старом кострище, а угли залейте водой полностью.',
          'In summer the slopes are very dry. Use a gas stove. If you must have a fire, use an old fire ring and drown the embers fully.',
        ],
        wrongExplanation: [
          'Bitta uchqun ham yonbagʻirni yondirishi mumkin. Choʻgʻ sovuq boʻlguncha suv quying.',
          'Одна искра может поджечь склон. Заливайте угли, пока они не станут холодными.',
          'One spark can set a hillside alight. Pour water until the ashes are cold.',
        ],
      },
      {
        prompt: [
          'Lager yonida tulki ovqat soʻrab kelyapti. Nima qilasiz?',
          'У лагеря лиса выпрашивает еду. Что делать?',
          'A fox near camp is begging for food. What do you do?',
        ],
        hint: [
          'Yovvoyi hayvon yovvoyi qolishi kerak.',
          'Дикое животное должно оставаться диким.',
          'A wild animal should stay wild.',
        ],
        answer: [
          'Boqmaslik va ovqatni yopiq saqlash',
          'Не кормить и убрать еду',
          'Do not feed it and pack your food away',
        ],
        wrong: [
          ['Ozgina non berish', 'Дать немного хлеба', 'Give it a bit of bread'],
          [
            'Suratga olish uchun yaqinlashish',
            'Подойти ближе для фото',
            'Move closer for a photo',
          ],
          ['Qoʻl bilan silash', 'Погладить', 'Pet it'],
        ],
        explanation: [
          'Boqilgan hayvon odamlardan qoʻrqmay qoladi, tishlashi va kasallik yuqtirishi mumkin. Ovqatni yopiq saqlang.',
          'Прикормленные животные перестают бояться людей, могут укусить и передать болезнь. Храните еду закрытой.',
          'Fed animals lose their fear of people, may bite and can carry disease. Keep food sealed away.',
        ],
        wrongExplanation: [
          'Ozgina ovqat ham hayvonga zarar beradi. Masofani saqlang, boqmang.',
          'Даже немного еды вредит животному. Держите дистанцию и не кормите.',
          'Even a little food harms the animal. Keep your distance and do not feed it.',
        ],
      },
      {
        prompt: [
          'Idishlarni qayerda yuvasiz?',
          'Где мыть посуду?',
          'Where do you wash your dishes?',
        ],
        answer: [
          'Soydan uzoqda, suvni idishda olib',
          'Вдали от ручья, набрав воду в ёмкость',
          'Away from the stream, using water in a pot',
        ],
        wrong: [
          ['Toʻgʻridan-toʻgʻri soyda', 'Прямо в ручье', 'Right in the stream'],
          ['Buloq ichida', 'В роднике', 'In the spring itself'],
          ['Koʻlda sovun bilan', 'В озере с мылом', 'In the lake with soap'],
        ],
        explanation: [
          'Sovun, hatto «eko» boʻlsa ham, suvni ifloslantiradi. Suvni olib, kamida 60 metr narida yuving va iflos suvni tuproqqa sepib yuboring.',
          'Мыло, даже «эко», загрязняет воду. Наберите воду и мойте посуду минимум в 60 м от водоёма, а грязную воду разбрызгайте по земле.',
          'Soap, even "eco" soap, pollutes water. Carry water at least 60 m away to wash, then scatter the dirty water on the ground.',
        ],
        wrongExplanation: [
          'Soy va koʻllardan pastda odamlar va hayvonlar suv ichadi. Ularni toza saqlang.',
          'Ниже по течению из ручьёв пьют люди и животные. Берегите воду чистой.',
          'People and animals downstream drink from streams and lakes. Keep them clean.',
        ],
      },
      {
        prompt: [
          'Soʻqmoqda chiroyli tosh topdingiz. Nima qilasiz?',
          'Вы нашли на тропе красивый камень. Что делать?',
          'You find a beautiful stone on the trail. What do you do?',
        ],
        hint: [
          'Qoldiring, ammo eslab qoling.',
          'Оставьте, но запомните.',
          'Leave it, but remember it.',
        ],
        answer: [
          'Joyida qoldirish',
          'Оставить на месте',
          'Leave it where it is',
        ],
        wrong: [
          ['Esdalik uchun olish', 'Забрать на память', 'Take it as a souvenir'],
          [
            'Ismingizni yozib qoʻyish',
            'Написать на нём своё имя',
            'Write your name on it',
          ],
          [
            'Yangi tur yasash',
            'Сложить новый тур из камней',
            'Build a new cairn with it',
          ],
        ],
        explanation: [
          'Togʻni hamma uchun asl holida qoldiring. Yangi turlar esa yoʻlovchilarni chalgʻitishi mumkin.',
          'Оставляйте горы такими, какими они были. А лишние туры из камней могут сбить других с пути.',
          'Leave the mountains as you found them. Extra cairns can also mislead other hikers.',
        ],
        wrongExplanation: [
          'Faqat surat oling, faqat iz qoldiring.',
          'Берите только фото, оставляйте только следы.',
          'Take only photos, leave only footprints.',
        ],
      },
      {
        prompt: [
          'Lagerda kechqurun musiqa haqida nima toʻgʻri?',
          'Что верно про музыку в лагере вечером?',
          'What is right about music at camp in the evening?',
        ],
        answer: [
          'Tinch boʻlish: tabiat va boshqa sayyohlarni hurmat qilish',
          'Не шуметь: уважать природу и других туристов',
          'Keep it quiet: respect nature and other campers',
        ],
        wrong: [
          [
            'Kolonkani balandroq qoʻyish',
            'Включить колонку погромче',
            'Turn the speaker up',
          ],
          ['Tun boʻyi qoʻshiq aytish', 'Петь всю ночь', 'Sing all night'],
          [
            'Hayvonlarni haydash uchun shovqin qilish',
            'Шуметь, чтобы отпугнуть зверей',
            'Make noise all night to scare animals',
          ],
        ],
        explanation: [
          'Togʻlarda tovush uzoqqa ketadi. Boshqalar tinchlik uchun kelgan, hayvonlar esa bezovta boʻladi.',
          'В горах звук разносится далеко. Другие пришли за тишиной, а животных шум тревожит.',
          'Sound carries far in the mountains. Others came for the quiet, and noise disturbs wildlife.',
        ],
        wrongExplanation: [
          'Tabiat tovushlaridan bahramand boʻling va boshqalarga ham imkon bering.',
          'Наслаждайтесь звуками природы и дайте это сделать другим.',
          'Enjoy the sounds of nature and let others enjoy them too.',
        ],
      },
    ],
  },
  {
    tierKey: '1',
    icon: 'padlock',
    title: ['Zarur jihozlar', 'Основное снаряжение', 'Gear essentials'],
    questions: [
      {
        prompt: [
          'Kunduzgi sayrga ham fonar kerakmi?',
          'Нужен ли фонарик даже в однодневный поход?',
          'Do you need a headlamp even on a day hike?',
        ],
        hint: [
          'Rejalar har doim ham vaqtida tugamaydi.',
          'Планы не всегда укладываются во время.',
          'Plans do not always finish on time.',
        ],
        answer: [
          'Ha, kechikish har doim mumkin',
          'Да, задержка возможна всегда',
          'Yes, delays can always happen',
        ],
        wrong: [
          [
            'Yoʻq, telefon chirogʻi yetarli',
            'Нет, хватит фонарика телефона',
            'No, the phone light is enough',
          ],
          ['Faqat qishda', 'Только зимой', 'Only in winter'],
          [
            'Faqat tunda chiqsangiz',
            'Только если выходите ночью',
            'Only if you start at night',
          ],
        ],
        explanation: [
          'Jarohat yoki adashish sizni qorongʻida qoldirishi mumkin. Fonar qoʻllarni boʻsh qoldiradi va telefon quvvatini tejaydi.',
          'Травма или ошибка в пути могут задержать вас до темноты. Налобный фонарь освобождает руки и бережёт заряд телефона.',
          'An injury or a wrong turn can keep you out after dark. A headlamp frees your hands and saves phone battery.',
        ],
        wrongExplanation: [
          'Telefon chirogʻi quvvatni tez tugatadi. Har doim fonar va zaxira batareya oling.',
          'Фонарик телефона быстро сажает батарею. Всегда берите налобный фонарь и запасные батарейки.',
          'The phone light drains the battery fast. Always carry a headlamp and spare batteries.',
        ],
      },
      {
        prompt: [
          'Togʻ sayri uchun qaysi ichki kiyim eng yomon?',
          'Какое бельё хуже всего для похода в горы?',
          'Which base layer is worst for a mountain hike?',
        ],
        answer: ['Paxta futbolka', 'Хлопковая футболка', 'A cotton T-shirt'],
        wrong: [
          [
            'Sintetik futbolka',
            'Синтетическая футболка',
            'A synthetic T-shirt',
          ],
          [
            'Merinos jun futbolka',
            'Футболка из шерсти мериноса',
            'A merino wool T-shirt',
          ],
          [
            'Tez quriydigan sport futbolka',
            'Быстросохнущая спортивная футболка',
            'A quick-dry sports T-shirt',
          ],
        ],
        explanation: [
          'Paxta terni ushlab qoladi va sekin quriydi. Shamol va sovuqda hoÊ»l paxta tanani tez sovutadi.',
          'Хлопок впитывает пот и долго сохнет. На ветру и в холоде мокрая хлопковая ткань быстро охлаждает тело.',
          'Cotton holds sweat and dries slowly. In wind and cold, wet cotton chills you fast.',
        ],
        wrongExplanation: [
          'Sintetika va jun hoʻl boʻlsa ham issiqlikni saqlaydi. Paxtani shahar uchun qoldiring.',
          'Синтетика и шерсть греют даже влажными. Хлопок оставьте для города.',
          'Synthetics and wool stay warm when damp. Save cotton for the city.',
        ],
      },
      {
        prompt: [
          'Kiyimni qanday kiyish toʻgʻri?',
          'Как правильно одеваться в поход?',
          'What is the right way to dress for a hike?',
        ],
        hint: ['Piyozni eslang.', 'Вспомните луковицу.', 'Think of an onion.'],
        answer: [
          'Qatlamlab: ichki, isituvchi va shamoldan himoya',
          'Слоями: базовый, утепляющий и защитный от ветра',
          'In layers: base, warm and wind/rain shell',
        ],
        wrong: [
          ['Bitta qalin kurtka', 'Одна толстая куртка', 'One thick jacket'],
          [
            'Faqat futbolka, issiq boʻladi',
            'Только футболка, всё равно будет жарко',
            'Just a T-shirt, it will be warm',
          ],
          [
            'Hamma narsani bir kiyib, yechmaslik',
            'Надеть всё сразу и не снимать',
            'Put everything on and never take it off',
          ],
        ],
        explanation: [
          'Qatlamlar haroratni boshqarishga yordam beradi: koʻtarilishda yeching, toʻxtaganda va choʻqqida kiying.',
          'Слои позволяют управлять теплом: на подъёме снимайте, на привале и на вершине надевайте.',
          'Layers let you control heat: take them off on the climb, put them on at rests and at the top.',
        ],
        wrongExplanation: [
          'Bitta qalin kurtkada terlaysiz, keyin sovuq qotasiz. Qatlamlar yaxshiroq.',
          'В одной толстой куртке вы вспотеете, а потом замёрзнете. Слои лучше.',
          'In one thick jacket you sweat, then freeze. Layers work better.',
        ],
      },
      {
        prompt: [
          'Issiq kunda sayr uchun qancha suv olish kerak?',
          'Сколько воды брать в поход в жаркий день?',
          'How much water should you take on a hot day?',
        ],
        answer: [
          'Har soatga taxminan yarim litr va undan koʻp',
          'Примерно пол-литра в час и больше',
          'About half a litre per hour, or more',
        ],
        wrong: [
          [
            'Bitta kichik shisha butun kunga',
            'Одна маленькая бутылка на весь день',
            'One small bottle for the whole day',
          ],
          [
            'Suv shart emas, soylar bor',
            'Вода не нужна, есть ручьи',
            'None, there are streams',
          ],
          [
            'Faqat chanqaganda topiladi',
            'Найду, когда захочу пить',
            'Find some when thirsty',
          ],
        ],
        explanation: [
          'Yozda Oʻzbekistonda harorat 40°C ga yetadi. Yoʻlda buloq qurib qolishi mumkin, shuning uchun zaxira oling va buloq suvini filtrlang.',
          'Летом в Узбекистане бывает до +40°C. Родники могут пересохнуть, поэтому берите запас, а воду из источников фильтруйте.',
          'Summer in Uzbekistan can reach 40°C. Springs can run dry, so carry enough and filter any water you collect.',
        ],
        wrongExplanation: [
          'Suvsizlanish tez va sezdirmay keladi. Yetarli suv oling va tez-tez iching.',
          'Обезвоживание приходит быстро и незаметно. Берите достаточно воды и пейте понемногу часто.',
          'Dehydration comes fast and quietly. Carry enough water and sip often.',
        ],
      },
      {
        prompt: [
          'Hushtak nima uchun kerak?',
          'Зачем брать свисток?',
          'Why carry a whistle?',
        ],
        hint: [
          'Ovoz tez charchaydi.',
          'Голос быстро устаёт.',
          'Your voice tires quickly.',
        ],
        answer: [
          'Uch marta hushtak — yordam soʻrash belgisi',
          'Три свистка — сигнал бедствия',
          'Three blasts is a call for help',
        ],
        wrong: [
          [
            'Hayvonlarni chaqirish uchun',
            'Чтобы подзывать животных',
            'To call animals',
          ],
          [
            'Guruhni ertalab uygʻotish uchun',
            'Чтобы будить группу утром',
            'To wake the group in the morning',
          ],
          [
            'Hech narsa uchun, bu eskirgan',
            'Незачем, это устарело',
            'No reason, it is old-fashioned',
          ],
        ],
        explanation: [
          'Hushtak ovozi baqiriqdan uzoqqa yetadi va kuch talab qilmaydi. Uch qisqa signal yordam kerakligini bildiradi.',
          'Свисток слышно дальше крика, и он не отнимает сил. Три коротких сигнала — просьба о помощи.',
          'A whistle carries further than shouting and takes little energy. Three short blasts mean you need help.',
        ],
        wrongExplanation: [
          'Hushtak arzon, yengil va hayot saqlaydi. Uni ryukzak tasmasiga ilib qoʻying.',
          'Свисток дешёвый, лёгкий и спасает жизни. Повесьте его на лямку рюкзака.',
          'A whistle is cheap, light and saves lives. Clip it to your backpack strap.',
        ],
      },
      {
        prompt: [
          'Togʻda qanday poyabzal kiyish kerak?',
          'Какую обувь надеть в горы?',
          'What footwear is best for the mountains?',
        ],
        answer: [
          'Yaxshi tagcharmli, oyoqqa oʻrgangan trekking poyabzal',
          'Треккинговая обувь с хорошей подошвой, уже разношенная',
          'Broken-in hiking shoes with a grippy sole',
        ],
        wrong: [
          [
            'Yangi, birinchi marta kiyilgan etik',
            'Новые ботинки, надетые впервые',
            'Brand-new boots worn for the first time',
          ],
          ['Shippak', 'Шлёпанцы', 'Flip-flops'],
          [
            'Silliq tagli shahar krossovkasi',
            'Городские кеды с гладкой подошвой',
            'City sneakers with a smooth sole',
          ],
        ],
        explanation: [
          'Yaxshi tagcharm toshloq va hoʻl yoʻlda sirgʻanishdan saqlaydi. Yangi poyabzalni oldin shaharda kiyib koʻring — aks holda pufak chiqadi.',
          'Хорошая подошва держит на осыпях и мокрых камнях. Новую обувь сначала разносите в городе, иначе будут мозоли.',
          'A good sole grips on loose and wet rock. Break new boots in at home first, or you will get blisters.',
        ],
        wrongExplanation: [
          'Notoʻgʻri poyabzal — oyoq burilishi va yiqilishning keng tarqalgan sababi.',
          'Неподходящая обувь — частая причина подвёрнутых ног и падений.',
          'The wrong shoes are a common cause of twisted ankles and falls.',
        ],
      },
      {
        prompt: [
          'Yoʻl boshida havo ochiq va issiq. Yomgʻirpoʻsh kerakmi?',
          'Внизу ясно и жарко. Нужен ли дождевик?',
          'It is sunny and hot at the trailhead. Do you need a rain jacket?',
        ],
        hint: [
          'Togʻda ob-havo bir soatda oʻzgaradi.',
          'В горах погода меняется за час.',
          'Mountain weather can change within an hour.',
        ],
        answer: ['Ha, har doim', 'Да, всегда', 'Yes, always'],
        wrong: [
          [
            'Yoʻq, prognoz yaxshi',
            'Нет, прогноз хороший',
            'No, the forecast is good',
          ],
          ['Faqat kuzda', 'Только осенью', 'Only in autumn'],
          [
            'Faqat 3000 metrdan yuqorida',
            'Только выше 3000 метров',
            'Only above 3000 metres',
          ],
        ],
        explanation: [
          'Har 1000 metr balandlikda harorat taxminan 6–7°C pasayadi. Yomgʻir va shamol bilan yozda ham sovuq qotish mumkin.',
          'С каждыми 1000 м высоты становится холоднее примерно на 6–7°C. С дождём и ветром замёрзнуть можно и летом.',
          'It gets about 6–7°C colder with every 1000 m of height. With rain and wind you can get dangerously cold even in summer.',
        ],
        wrongExplanation: [
          'Yengil yomgʻirpoʻsh ryukzakda deyarli joy egallamaydi, ammo vaziyatni qutqarishi mumkin.',
          'Лёгкий дождевик почти не занимает места, но может спасти ситуацию.',
          'A light rain jacket takes almost no space and can save the day.',
        ],
      },
      {
        prompt: [
          'Togʻda quyoshdan himoya haqida nima toʻgʻri?',
          'Что верно про защиту от солнца в горах?',
          'What is true about sun protection in the mountains?',
        ],
        answer: [
          'Balandlikda quyosh kuchliroq: krem, koʻzoynak va bosh kiyim kerak',
          'На высоте солнце сильнее: нужны крем, очки и головной убор',
          'The sun is stronger up high: use sunscreen, sunglasses and a hat',
        ],
        wrong: [
          [
            'Bulutli kunda kerak emas',
            'В облачный день не нужна',
            'Not needed on cloudy days',
          ],
          [
            'Shamol boʻlsa kuyib qolmaysiz',
            'На ветру не обгоришь',
            'You cannot burn when it is windy',
          ],
          ['Faqat yozda kerak', 'Нужна только летом', 'Only needed in summer'],
        ],
        explanation: [
          'Balandlikda ultrabinafsha nurlar kuchliroq, qor esa ularni qaytaradi. Bulut va shamol kuyishdan saqlamaydi.',
          'На высоте ультрафиолет сильнее, а снег его отражает. Облака и ветер от ожогов не спасают.',
          'UV is stronger at altitude and snow reflects it. Clouds and wind do not stop sunburn.',
        ],
        wrongExplanation: [
          'Togʻda yil boʻyi, har qanday ob-havoda quyoshdan himoyalaning.',
          'В горах защищайтесь от солнца круглый год и в любую погоду.',
          'Protect yourself from the sun all year and in any weather in the mountains.',
        ],
      },
      {
        prompt: [
          'Kichik aptechkada nima boʻlishi kerak?',
          'Что должно быть в маленькой аптечке?',
          'What belongs in a small first-aid kit?',
        ],
        hint: [
          'Eng koʻp uchraydigan muammolarni oʻylang.',
          'Подумайте о самых частых проблемах.',
          'Think about the most common problems.',
        ],
        answer: [
          'Bint, plastir, pufak plastiri, dezinfeksiya, shaxsiy dorilar',
          'Бинт, пластыри, пластырь от мозолей, антисептик, личные лекарства',
          'Bandages, plasters, blister pads, antiseptic, personal medicines',
        ],
        wrong: [
          [
            'Faqat ogʻriq qoldiruvchi',
            'Только обезболивающее',
            'Only painkillers',
          ],
          [
            'Hech narsa, guruhda kimdadir bor',
            'Ничего, у кого-то в группе найдётся',
            'Nothing, someone in the group will have one',
          ],
          ['Faqat vitaminlar', 'Только витамины', 'Only vitamins'],
        ],
        explanation: [
          'Pufak, tirnalish va kesilish — eng koʻp uchraydigan muammolar. Shaxsiy dorilaringizni doim oʻzingiz bilan oling.',
          'Мозоли, ссадины и порезы — самые частые проблемы. Личные лекарства всегда держите при себе.',
          'Blisters, scrapes and cuts are the most common problems. Always carry your own personal medicines.',
        ],
        wrongExplanation: [
          'Har bir kishida oddiy aptechka boʻlsin va undan foydalanishni bilsin.',
          'У каждого должна быть простая аптечка и умение ею пользоваться.',
          'Everyone should carry a simple kit and know how to use it.',
        ],
      },
      {
        prompt: [
          'Ryukzakni qachon tekshirasiz?',
          'Когда проверять рюкзак?',
          'When do you check your backpack?',
        ],
        answer: [
          'Kechqurun, chiqishdan oldin, roʻyxat boʻyicha',
          'Накануне вечером, по списку',
          'The evening before, using a checklist',
        ],
        wrong: [
          ['Soʻqmoq boshida', 'В начале тропы', 'At the trailhead'],
          [
            'Biror narsa kerak boʻlganda',
            'Когда что-то понадобится',
            'When you need something',
          ],
          [
            'Hech qachon, oʻtgan safar yetardi',
            'Никогда, в прошлый раз всего хватило',
            'Never, it was fine last time',
          ],
        ],
        explanation: [
          'Roʻyxat fonar, suv yoki aptechkani unutmaslikka yordam beradi. Batareyalar va gaz miqdorini ham tekshiring.',
          'Список помогает не забыть фонарь, воду или аптечку. Проверьте и заряд батарей, и газ.',
          'A checklist helps you not forget the headlamp, water or first-aid kit. Check batteries and gas too.',
        ],
        wrongExplanation: [
          'Soʻqmoqda unutilgan narsani topib boʻlmaydi. Oldindan tayyorlaning.',
          'На тропе забытое уже не достать. Готовьтесь заранее.',
          'On the trail you cannot fetch what you forgot. Prepare ahead.',
        ],
      },
    ],
  },
  // ───────────────────────── Tier 2 ─────────────────────────
  {
    tierKey: '2',
    icon: 'cloud',
    title: ['Ob-havo belgilari', 'Приметы погоды', 'Weather signs'],
    questions: [
      {
        prompt: [
          'Yozda togʻda momaqaldiroq koʻpincha qachon boshlanadi?',
          'Когда летом в горах чаще всего начинаются грозы?',
          'When do summer thunderstorms usually start in the mountains?',
        ],
        hint: [
          'Quyosh yerni butun ertalab isitadi.',
          'Солнце греет склоны всё утро.',
          'The sun heats the slopes all morning.',
        ],
        answer: ['Tushdan keyin', 'После обеда', 'In the afternoon'],
        wrong: [
          ['Tong otganda', 'На рассвете', 'At dawn'],
          ['Faqat yarim tunda', 'Только в полночь', 'Only at midnight'],
          ['Hech qachon yozda', 'Летом никогда', 'Never in summer'],
        ],
        explanation: [
          'Issiq havo koʻtarilib, tushdan keyin momaqaldiroq bulutlarini hosil qiladi. Erta chiqing va choʻqqidan tushdan oldin tushing.',
          'Тёплый воздух поднимается и к обеду собирает грозовые облака. Выходите рано и уходите с вершины до обеда.',
          'Warm air rises and builds storm clouds by the afternoon. Start early and be off the summit by midday.',
        ],
        wrongExplanation: [
          'Togʻda yozgi momaqaldiroq odatda tushdan keyin keladi. Erta chiqish — eng yaxshi himoya.',
          'Летние грозы в горах обычно приходят после обеда. Ранний выход — лучшая защита.',
          'Summer mountain storms usually come in the afternoon. An early start is your best protection.',
        ],
      },
      {
        prompt: [
          'Bulutlar tez oʻsib, minoradek koʻtarilyapti. Bu nimani bildiradi?',
          'Облака быстро растут вверх, как башни. Что это значит?',
          'Clouds are growing fast into tall towers. What does it mean?',
        ],
        answer: [
          'Momaqaldiroq yaqinlashmoqda — tushishni boshlash kerak',
          'Близится гроза — пора спускаться',
          'A storm is building — start heading down',
        ],
        wrong: [
          ['Havo ochiladi', 'Погода проясняется', 'The weather is clearing'],
          [
            'Bu chiroyli surat uchun ajoyib vaqt',
            'Отличное время для фото',
            'Great time for photos',
          ],
          [
            'Hech narsa, bular oddiy bulutlar',
            'Ничего, обычные облака',
            'Nothing, they are just clouds',
          ],
        ],
        explanation: [
          'Tez oʻsayotgan toʻp-toʻp bulutlar momaqaldiroq bulutiga aylanishi mumkin. Tizma va choʻqqidan pastroqqa erta tushing.',
          'Быстро растущие кучевые облака могут стать грозовыми. Уходите с гребня и вершины заранее.',
          'Fast-growing cumulus clouds can turn into thunderclouds. Leave ridges and summits early.',
        ],
        wrongExplanation: [
          'Bulutlar yuqoriga oʻssa, kutmang. Momaqaldiroqdan oldin tushish xavfsizroq.',
          'Если облака растут вверх, не ждите. Спуститься до грозы безопаснее.',
          'When clouds grow upwards, do not wait. Getting down before the storm is safer.',
        ],
      },
      {
        prompt: [
          'Har 1000 metr koʻtarilganda havo qanchaga soviydi?',
          'Насколько холоднее становится с каждыми 1000 м подъёма?',
          'How much colder does it get for every 1000 m you climb?',
        ],
        hint: ['Bir necha gradus.', 'На несколько градусов.', 'A few degrees.'],
        answer: ['Taxminan 6–7°C', 'Примерно на 6–7°C', 'About 6–7°C'],
        wrong: [
          ['Oʻzgarmaydi', 'Не меняется', 'It does not change'],
          ['Taxminan 1°C', 'Примерно на 1°C', 'About 1°C'],
          ['Taxminan 20°C', 'Примерно на 20°C', 'About 20°C'],
        ],
        explanation: [
          'Toshkentda +30°C boʻlsa, Katta Chimyon choʻqqisida (3309 m) ancha salqin boʻladi, shamol esa yanada sovuqroq his qildiradi.',
          'Если в Ташкенте +30°C, на вершине Большого Чимгана (3309 м) намного прохладнее, а ветер добавляет холода.',
          'If it is 30°C in Tashkent, the top of Big Chimgan (3309 m) is much cooler, and wind makes it feel colder still.',
        ],
        wrongExplanation: [
          'Balandlikda doim sovuqroq. Shahardagi ob-havoga qarab kiyinmang.',
          'На высоте всегда холоднее. Не одевайтесь по городской погоде.',
          'It is always colder higher up. Do not dress for the city weather.',
        ],
      },
      {
        prompt: [
          'Chaqmoqdan momaqaldiroqqacha 30 soniyadan kam vaqt oʻtdi. Nima qilasiz?',
          'Между молнией и громом меньше 30 секунд. Что делать?',
          'Less than 30 seconds pass between lightning and thunder. What do you do?',
        ],
        answer: [
          'Darhol xavfsizroq joyga tushish',
          'Сразу уходить в более безопасное место',
          'Move to safer ground immediately',
        ],
        wrong: [
          [
            'Yana 30 daqiqa yurishni davom ettirish',
            'Идти дальше ещё полчаса',
            'Keep going for another half hour',
          ],
          [
            'Yolgʻiz daraxt ostiga yashirinish',
            'Спрятаться под одиноким деревом',
            'Shelter under a lone tree',
          ],
          [
            'Choʻqqiga tezroq chiqish',
            'Быстрее подняться на вершину',
            'Rush to the summit',
          ],
        ],
        explanation: [
          '30 soniyadan kam boʻlsa, chaqmoq sizga yetadigan masofada. Oxirgi momaqaldiroqdan keyin 30 daqiqa kuting.',
          'Меньше 30 секунд — молния достаёт до вас. После последнего раската подождите 30 минут.',
          'Under 30 seconds means lightning can reach you. Wait 30 minutes after the last thunder before going on.',
        ],
        wrongExplanation: [
          'Yolgʻiz daraxt va choʻqqi chaqmoqni oʻziga tortadi. Pastga va ochiq tizmadan uzoqlashing.',
          'Одинокие деревья и вершины притягивают молнию. Спускайтесь и уходите с открытого гребня.',
          'Lone trees and summits attract lightning. Go down and get off exposed ridges.',
        ],
      },
      {
        prompt: [
          'Sayohatdan oldin ob-havoni qachon tekshirish kerak?',
          'Когда проверять прогноз перед походом?',
          'When should you check the forecast before a hike?',
        ],
        hint: [
          'Bir martadan koʻproq.',
          'Больше одного раза.',
          'More than once.',
        ],
        answer: [
          'Bir necha kun oldin va chiqish kuni ertalab',
          'За несколько дней и утром в день выхода',
          'A few days before and again on the morning you leave',
        ],
        wrong: [
          ['Faqat bir hafta oldin', 'Только за неделю', 'Only a week before'],
          ['Shart emas', 'Не обязательно', 'No need to check'],
          ['Faqat choʻqqida', 'Только на вершине', 'Only at the summit'],
        ],
        explanation: [
          'Prognoz oʻzgarib turadi. Togʻ hududi uchun alohida prognozga qarang va xavfli boʻlsa, rejani oʻzgartiring.',
          'Прогноз меняется. Смотрите прогноз именно для гор и меняйте план, если он опасный.',
          'Forecasts change. Look at a forecast for the mountain area itself and change your plan if it looks dangerous.',
        ],
        wrongExplanation: [
          'Eskirgan prognoz xavfli. Chiqishdan oldin yana bir bor tekshiring.',
          'Устаревший прогноз опасен. Проверьте ещё раз перед выходом.',
          'An old forecast is risky. Check again just before you leave.',
        ],
      },
      {
        prompt: [
          'Koʻtarilayotganda tuman tushdi va hech narsa koʻrinmayapti. Nima qilasiz?',
          'На подъёме опустился туман, ничего не видно. Что делать?',
          'Fog rolls in on the climb and you cannot see. What do you do?',
        ],
        answer: [
          'Toʻxtab, navigatsiyani tekshirish yoki tuman tarqalishini kutish',
          'Остановиться, сверить навигацию или переждать',
          'Stop, check navigation or wait for it to clear',
        ],
        wrong: [
          [
            'Tezroq yurib, tumandan chiqib ketish',
            'Ускориться, чтобы выйти из тумана',
            'Speed up to get out of the fog',
          ],
          [
            'Guruhdan oldinga ketish',
            'Уйти вперёд от группы',
            'Go ahead of the group',
          ],
          [
            'Toʻgʻriga yurish',
            'Идти напрямик',
            'Walk in a straight line anywhere',
          ],
        ],
        explanation: [
          'Tumanda jarlik va yoʻl ayrilishini koʻrmaysiz. Guruh bilan birga boʻling, xarita va GPSdan foydalaning.',
          'В тумане не видно обрывов и развилок. Держитесь группой, пользуйтесь картой и GPS.',
          'In fog you cannot see drop-offs or junctions. Stay together and use your map and GPS.',
        ],
        wrongExplanation: [
          'Tumanda shoshilish adashish va yiqilishga olib keladi. Sekinlashing.',
          'Спешка в тумане ведёт к ошибкам и падениям. Замедлитесь.',
          'Rushing in fog leads to wrong turns and falls. Slow down.',
        ],
      },
      {
        prompt: [
          'Togʻda bahor ob-havosi haqida nima toʻgʻri?',
          'Что верно про весеннюю погоду в горах?',
          'What is true about spring weather in the mountains?',
        ],
        hint: [
          'Bir kunda toʻrt fasl.',
          'Четыре сезона за день.',
          'Four seasons in one day.',
        ],
        answer: [
          'Bir kunda quyosh, yomgʻir va qor boʻlishi mumkin',
          'За день может быть и солнце, и дождь, и снег',
          'Sun, rain and snow can all happen in one day',
        ],
        wrong: [
          [
            'Bahorda togʻda doim issiq',
            'Весной в горах всегда тепло',
            'It is always warm in spring',
          ],
          [
            'Qor faqat dekabrda yogʻadi',
            'Снег бывает только в декабре',
            'Snow only falls in December',
          ],
          [
            'Bahorda yomgʻir boʻlmaydi',
            'Весной дождей не бывает',
            'It never rains in spring',
          ],
        ],
        explanation: [
          'Chimyon va Beldersoyda bahorda havo tez oʻzgaradi. Issiq kiyim va yomgʻirpoʻshni har doim oling.',
          'Весной в Чимгане и Бельдерсае погода меняется быстро. Тёплая одежда и дождевик нужны всегда.',
          'In spring, weather in Chimgan and Beldersay changes fast. Always carry warm layers and a rain jacket.',
        ],
        wrongExplanation: [
          'Bahorda togʻda qor ham yogʻishi mumkin. Har qanday ob-havoga tayyor boʻling.',
          'Весной в горах может выпасть и снег. Будьте готовы к любой погоде.',
          'It can snow in spring in the mountains. Be ready for any weather.',
        ],
      },
      {
        prompt: [
          'Kuchli shamol nimaga xavfli?',
          'Чем опасен сильный ветер?',
          'Why is strong wind dangerous?',
        ],
        answer: [
          'Tanani tez sovutadi va tizmada muvozanatni buzadi',
          'Быстро охлаждает и сбивает с равновесия на гребне',
          'It chills you fast and can knock you off balance on a ridge',
        ],
        wrong: [
          ['Faqat shovqin qiladi', 'Он только шумит', 'It is only noisy'],
          [
            'Terlashni toʻxtatadi, bu foydali',
            'Он подсушивает пот, это полезно',
            'It dries sweat, which is good',
          ],
          [
            'Shamol hech qachon xavfli emas',
            'Ветер никогда не опасен',
            'Wind is never dangerous',
          ],
        ],
        explanation: [
          'Shamol issiqlikni tez olib ketadi, ayniqsa hoʻl kiyimda. Tor tizmada kuchli shamolda orqaga qaytish yaxshiroq.',
          'Ветер быстро уносит тепло, особенно с мокрой одеждой. На узком гребне в сильный ветер лучше повернуть назад.',
          'Wind steals heat fast, especially with wet clothes. On a narrow ridge in strong wind, turning back is wiser.',
        ],
        wrongExplanation: [
          'Shamol sovuq qotishni tezlashtiradi. Shamoldan himoya qiluvchi kurtka kiying.',
          'Ветер ускоряет переохлаждение. Надевайте ветрозащитную куртку.',
          'Wind speeds up getting cold. Put on a windproof jacket.',
        ],
      },
      {
        prompt: [
          'Havo birdan sovib, osmon qorayib ketdi. Bu nimani bildiradi?',
          'Резко похолодало и потемнело небо. Что это значит?',
          'It suddenly gets colder and the sky darkens. What does it mean?',
        ],
        hint: [
          'Tabiat ogohlantiryapti.',
          'Природа предупреждает.',
          'Nature is giving a warning.',
        ],
        answer: [
          'Ob-havo yomonlashmoqda — rejani qayta koʻrish kerak',
          'Погода портится — пора пересмотреть план',
          'The weather is turning — rethink your plan',
        ],
        wrong: [
          [
            'Kechqurun boʻldi, xolos',
            'Просто наступает вечер',
            'It is just evening',
          ],
          ['Havo yaxshilanadi', 'Погода улучшится', 'The weather will improve'],
          ['Bu muhim emas', 'Это неважно', 'It does not matter'],
        ],
        explanation: [
          'Keskin sovish va qorongʻi bulutlar yomgʻir, doʻl yoki momaqaldiroq oldidan keladi. Issiq kiyim kiying va qaytishni oʻylang.',
          'Резкое похолодание и тёмные тучи — признак дождя, града или грозы. Утеплитесь и подумайте о возвращении.',
          'A sharp chill and dark clouds come before rain, hail or a storm. Put on warm layers and think about turning back.',
        ],
        wrongExplanation: [
          'Belgilarni eʼtiborsiz qoldirmang. Erta qaror qilish xavfsizroq.',
          'Не игнорируйте признаки. Раннее решение безопаснее.',
          'Do not ignore the signs. Deciding early is safer.',
        ],
      },
      {
        prompt: [
          'Choʻqqi tepasida linza shaklidagi silliq bulut paydo boʻldi. Bu nima bildirishi mumkin?',
          'Над вершиной появилось гладкое облако-линза. Что оно может значить?',
          'A smooth lens-shaped cloud sits over the peak. What can it mean?',
        ],
        answer: [
          'Yuqorida kuchli shamol',
          'Сильный ветер на высоте',
          'Strong winds up high',
        ],
        wrong: [
          ['Tinch va issiq havo', 'Тихая тёплая погода', 'Calm, warm weather'],
          [
            'Yaqinda yer silkinishi',
            'Скорое землетрясение',
            'An earthquake soon',
          ],
          ['Choʻqqida yongʻin', 'Пожар на вершине', 'A fire on the summit'],
        ],
        explanation: [
          'Linzasimon bulutlar choʻqqilar ustida kuchli shamol esayotganini koʻrsatadi. Tizma va choʻqqida ehtiyot boʻling.',
          'Линзовидные облака показывают сильный ветер над хребтами. Будьте осторожны на гребне и вершине.',
          'Lens-shaped clouds show strong wind blowing over the peaks. Be careful on ridges and summits.',
        ],
        wrongExplanation: [
          'Bu bulutlar shamol belgisi. Pastda tinch boʻlsa ham, yuqorida shamol kuchli boʻlishi mumkin.',
          'Такие облака — знак ветра. Внизу может быть тихо, а наверху дуть сильно.',
          'These clouds are a wind sign. It may be calm below and very windy above.',
        ],
      },
    ],
  },
  {
    tierKey: '2',
    icon: 'paw',
    title: [
      'Hayvonlar va oʻsimliklar',
      'Животные и растения',
      'Wildlife & plants',
    ],
    questions: [
      {
        prompt: [
          'Soʻqmoqda ilon koʻrdingiz. Nima qilasiz?',
          'Вы увидели змею на тропе. Что делать?',
          'You see a snake on the trail. What do you do?',
        ],
        hint: [
          'Ilon sizdan koʻproq qoʻrqadi.',
          'Змея боится вас сильнее.',
          'The snake is more afraid of you.',
        ],
        answer: [
          'Toʻxtab, orqaga chekinish va unga yoʻl berish',
          'Остановиться, отойти назад и дать ей уйти',
          'Stop, back away and let it leave',
        ],
        wrong: [
          ['Tayoq bilan haydash', 'Прогнать палкой', 'Chase it with a stick'],
          [
            'Suratga olish uchun yaqinlashish',
            'Подойти ближе для фото',
            'Get closer for a photo',
          ],
          ['Ustidan sakrab oʻtish', 'Перепрыгнуть через неё', 'Jump over it'],
        ],
        explanation: [
          'Oʻrta Osiyoda gyurza, kobra va charxilon kabi zaharli ilonlar bor. Ular odatda faqat bezovta qilinganda chaqadi. Kamida 2–3 metr masofa saqlang.',
          'В Средней Азии есть ядовитые змеи: гюрза, кобра, эфа. Обычно они кусают, только если их тревожат. Держитесь в 2–3 метрах.',
          'Central Asia has venomous snakes such as the blunt-nosed viper, the Central Asian cobra and the saw-scaled viper. They usually bite only when disturbed. Keep 2–3 metres away.',
        ],
        wrongExplanation: [
          'Ilonga tegish yoki yaqinlashish chaqishning asosiy sababi. Masofa saqlang.',
          'Большинство укусов случается, когда змею трогают или подходят близко. Держите дистанцию.',
          'Most bites happen when people touch or approach snakes. Keep your distance.',
        ],
      },
      {
        prompt: [
          'Ilon chaqqanda nima qilish kerak?',
          'Что делать при укусе змеи?',
          'What should you do after a snake bite?',
        ],
        answer: [
          'Tinch turish, aʼzoni qimirlatmaslik, 112 ga qoʻngʻiroq qilish',
          'Сохранять покой, обездвижить конечность, звонить 112',
          'Keep calm and still, immobilise the limb, call 112',
        ],
        wrong: [
          [
            'Zaharni ogʻiz bilan soʻrib olish',
            'Отсосать яд ртом',
            'Suck out the venom',
          ],
          [
            'Jarohatni pichoq bilan kesish',
            'Надрезать рану ножом',
            'Cut the wound with a knife',
          ],
          [
            'Jgut bogʻlab, muz qoʻyish',
            'Наложить жгут и лёд',
            'Apply a tourniquet and ice',
          ],
        ],
        explanation: [
          'Harakat zaharni tez tarqatadi. Uzuk va soatni yeching, aʼzoni yurak darajasida ushlang va tezda tibbiy yordamga yetib boring.',
          'Движение ускоряет распространение яда. Снимите кольца и часы, держите конечность на уровне сердца и как можно быстрее доберитесь до врачей.',
          'Movement spreads venom faster. Remove rings and watches, keep the limb at heart level and get to medical help quickly.',
        ],
        wrongExplanation: [
          'Soʻrish, kesish, jgut va muz yordam bermaydi va zarar yetkazadi. Tinchlik va shifokor — eng muhimi.',
          'Отсасывание, надрезы, жгут и лёд не помогают и вредят. Главное — покой и врач.',
          'Sucking, cutting, tourniquets and ice do not help and cause harm. Calm and a doctor are what matter.',
        ],
      },
      {
        prompt: [
          'Kanadan qanday himoyalanish mumkin?',
          'Как защититься от клещей?',
          'How do you protect yourself from ticks?',
        ],
        hint: [
          'Ular baland oʻtlarda kutadi.',
          'Они ждут в высокой траве.',
          'They wait in tall grass.',
        ],
        answer: [
          'Uzun yeng va shim, ochiq rang, har kuni tanani tekshirish',
          'Длинные рукава и брюки, светлая одежда, ежедневный осмотр',
          'Long sleeves and trousers, light colours, daily body checks',
        ],
        wrong: [
          [
            'Shortik kiyish, tez yurish',
            'Шорты и быстрый шаг',
            'Wear shorts and walk fast',
          ],
          [
            'Kana faqat oʻrmonda boʻladi',
            'Клещи бывают только в лесу',
            'Ticks only live in forests',
          ],
          ['Kana xavfsiz', 'Клещи безопасны', 'Ticks are harmless'],
        ],
        explanation: [
          'Kanalar bahor va yozda faol. Shimni paypoqqa kiriting, repellent ishlating va kechqurun tanani, ayniqsa qoʻltiq va bosh terisini tekshiring.',
          'Клещи активны весной и летом. Заправьте брюки в носки, используйте репеллент и вечером осмотрите тело, особенно подмышки и голову.',
          'Ticks are active in spring and summer. Tuck trousers into socks, use repellent and check your body each evening, especially armpits and scalp.',
        ],
        wrongExplanation: [
          'Kanalar kasallik tashishi mumkin. Yopiq kiyim va tekshiruv — asosiy himoya.',
          'Клещи могут переносить болезни. Закрытая одежда и осмотр — главная защита.',
          'Ticks can carry disease. Covered skin and regular checks are the main protection.',
        ],
      },
      {
        prompt: [
          'Terida yopishgan kana topdingiz. Nima qilasiz?',
          'Вы нашли присосавшегося клеща. Что делать?',
          'You find a tick attached to your skin. What do you do?',
        ],
        answer: [
          'Pinset bilan teriga yaqin ushlab, sekin tortib olish',
          'Захватить пинцетом у самой кожи и плавно вытянуть',
          'Grip it close to the skin with tweezers and pull out slowly',
        ],
        wrong: [
          ['Moy yoki yogʻ surtish', 'Намазать маслом', 'Cover it with oil'],
          ['Gugurt bilan kuydirish', 'Прижечь спичкой', 'Burn it with a match'],
          [
            'Barmoqlar bilan ezib olish',
            'Раздавить пальцами',
            'Squeeze it with your fingers',
          ],
        ],
        explanation: [
          'Burab yoki silkitmay, bir tekis torting. Joyni dezinfeksiya qiling. Keyingi haftalarda isitma boʻlsa, shifokorga boring.',
          'Тяните ровно, без рывков. Обработайте место антисептиком. Если в ближайшие недели поднимется температура, обратитесь к врачу.',
          'Pull steadily without twisting or jerking. Clean the spot. If you get a fever in the following weeks, see a doctor.',
        ],
        wrongExplanation: [
          'Moy, olov va ezish yuqtirish xavfini oshirishi mumkin. Pinset ishlating.',
          'Масло, огонь и давление могут усилить заражение. Используйте пинцет.',
          'Oil, fire and squeezing can make infection more likely. Use tweezers.',
        ],
      },
      {
        prompt: [
          'Chotqol yoki Piskomda ayiqqa duch kelmaslik uchun nima qilish kerak?',
          'Как не встретить медведя в Чаткале или Пскеме?',
          'How do you avoid surprising a bear in Chatkal or Pskem?',
        ],
        hint: [
          'Ayiqlar ham uchrashishni xohlamaydi.',
          'Медведи тоже не хотят встречи.',
          'Bears do not want to meet you either.',
        ],
        answer: [
          'Gaplashib yoki shovqin qilib yurish, ovqatni lagerdan uzoqda saqlash',
          'Идти, разговаривая, и хранить еду вдали от палаток',
          'Make noise as you walk and store food away from tents',
        ],
        wrong: [
          ['Jim yurish', 'Идти очень тихо', 'Walk very quietly'],
          [
            'Ovqatni chodirda saqlash',
            'Хранить еду в палатке',
            'Keep food in your tent',
          ],
          [
            'Ayiq izlari ortidan borish',
            'Идти по медвежьим следам',
            'Follow bear tracks',
          ],
        ],
        explanation: [
          'Tyan-Shan qoʻngʻir ayigʻi odatda odamdan qochadi. Shovqin uni oldindan ogohlantiradi, toza lager esa ovqat hidi bilan jalb qilmaydi.',
          'Тяньшанский бурый медведь обычно избегает людей. Шум предупреждает его заранее, а чистый лагерь не манит запахом еды.',
          'The Tian Shan brown bear usually avoids people. Noise warns it early, and a clean camp does not attract it with food smells.',
        ],
        wrongExplanation: [
          'Kutilmagan uchrashuv eng xavfli. Shovqin qiling va ovqatni yopiq saqlang.',
          'Внезапная встреча — самая опасная. Шумите и храните еду закрытой.',
          'A surprise meeting is the most dangerous. Make noise and keep food sealed.',
        ],
      },
      {
        prompt: [
          'Uzoqda ayiq koʻrdingiz. Nima qilasiz?',
          'Вы видите медведя вдалеке. Что делать?',
          'You see a bear in the distance. What do you do?',
        ],
        answer: [
          'Yugurmasdan, sekin orqaga chekinish va unga yoʻl berish',
          'Не бежать, медленно отступить и дать ему уйти',
          'Do not run; back away slowly and give it space',
        ],
        wrong: [
          ['Tezda qochib ketish', 'Быстро убежать', 'Run away fast'],
          [
            'Yaqinlashib suratga olish',
            'Подойти и сфотографировать',
            'Approach for a photo',
          ],
          ['Daraxtga chiqish', 'Залезть на дерево', 'Climb a tree'],
        ],
        explanation: [
          'Yugurish ayiqni quvishga undashi mumkin. Tinch gapiring, guruh bilan birga turing va boshqa yoʻldan keting.',
          'Бег может спровоцировать погоню. Говорите спокойно, держитесь группой и уходите другим путём.',
          'Running can make a bear chase. Talk calmly, stay together as a group and leave by another way.',
        ],
        wrongExplanation: [
          'Ayiq odamdan tezroq yuguradi va daraxtga ham chiqa oladi. Sekin va tinch chekining.',
          'Медведь бегает быстрее человека и умеет лазить по деревьям. Отступайте медленно и спокойно.',
          'Bears run faster than people and can climb trees. Back away slowly and calmly.',
        ],
      },
      {
        prompt: [
          'Yaylovda katta choʻpon iti sizga qarab vovullab kelyapti. Nima qilasiz?',
          'На пастбище к вам с лаем бежит большая пастушья собака. Что делать?',
          'On a pasture a big shepherd dog runs at you barking. What do you do?',
        ],
        hint: [
          'U suruvni qoʻriqlayapti.',
          'Она охраняет отару.',
          'It is guarding the flock.',
        ],
        answer: [
          'Toʻxtash, tinch turish, keyin suruvdan sekin uzoqlashish',
          'Остановиться, стоять спокойно и медленно обойти отару',
          'Stop, stay calm, then move slowly away from the flock',
        ],
        wrong: [
          ['Yugurib qochish', 'Убежать', 'Run away'],
          ['Tosh otish', 'Бросать камни', 'Throw stones'],
          [
            'Koʻziga tikilib qarash',
            'Смотреть ей прямо в глаза',
            'Stare it in the eyes',
          ],
        ],
        explanation: [
          'Choʻpon itlari suruvni himoya qiladi. Suruvni keng aylanib oʻting, choʻpon boʻlsa, uni chaqiring.',
          'Пастушьи собаки защищают отару. Обходите стадо стороной, а если рядом пастух — позовите его.',
          'Shepherd dogs protect the flock. Give the sheep a wide berth, and call the shepherd if one is near.',
        ],
        wrongExplanation: [
          'Yugurish va tosh otish itni hujumga undaydi. Tinch turing va uzoqlashing.',
          'Бег и камни провоцируют нападение. Стойте спокойно и уходите.',
          'Running and throwing stones invite an attack. Stay calm and move away.',
        ],
      },
      {
        prompt: [
          'Notanish rezavor yoki qoʻziqorinni yeyish mumkinmi?',
          'Можно ли есть незнакомые ягоды или грибы?',
          'Can you eat unknown berries or mushrooms?',
        ],
        answer: [
          'Yoʻq, aniq bilmasangiz yemang',
          'Нет, если не уверены на сто процентов',
          'No, not unless you are completely sure',
        ],
        wrong: [
          [
            'Ha, qushlar yesa xavfsiz',
            'Да, если их едят птицы',
            'Yes, if birds eat them',
          ],
          [
            'Ha, ozgina tatib koʻrish mumkin',
            'Да, немного попробовать можно',
            'Yes, a small taste is fine',
          ],
          [
            'Ha, yorqin rangli boʻlsa',
            'Да, если они яркие',
            'Yes, if they are brightly coloured',
          ],
        ],
        explanation: [
          'Baʼzi zaharli oʻsimlik va qoʻziqorinlar yeyiladiganlarga juda oʻxshaydi. Ozgina miqdor ham ogʻir zaharlanishga olib keladi.',
          'Некоторые ядовитые растения и грибы очень похожи на съедобные. Даже немного может вызвать тяжёлое отравление.',
          'Some poisonous plants and mushrooms look very like edible ones. Even a little can cause serious poisoning.',
        ],
        wrongExplanation: [
          'Qushlar odam uchun zaharli narsalarni yeya oladi. Shubha boʻlsa — yemang.',
          'Птицы могут есть то, что ядовито для человека. Сомневаетесь — не ешьте.',
          'Birds can eat things that poison people. If in doubt, leave it out.',
        ],
      },
      {
        prompt: [
          'Ertalab chodirda nega poyabzalni silkitish kerak?',
          'Зачем утром вытряхивать обувь у палатки?',
          'Why shake out your boots in the morning at camp?',
        ],
        hint: [
          'Issiq va qorongʻi joyni kim yaxshi koʻradi?',
          'Кто любит тёплые тёмные места?',
          'Who likes warm, dark places?',
        ],
        answer: [
          'Ichida chayon yoki oʻrgimchak boʻlishi mumkin',
          'Внутри может быть скорпион или паук',
          'A scorpion or spider may be inside',
        ],
        wrong: [
          [
            'Qumni chiqarish uchun, xolos',
            'Только чтобы высыпать песок',
            'Only to get sand out',
          ],
          [
            'Bu eski odat, foydasi yoʻq',
            'Это старая привычка без пользы',
            'It is an old habit with no use',
          ],
          [
            'Poyabzal tezroq quriydi',
            'Так обувь быстрее сохнет',
            'It dries the boots faster',
          ],
        ],
        explanation: [
          'Quruq va issiq hududlarda chayon va qoraqurt uchraydi. Poyabzal va kiyimni kiyishdan oldin silkiting.',
          'В сухих тёплых районах встречаются скорпионы и каракурт. Вытряхивайте обувь и одежду перед тем, как надеть.',
          'Scorpions and black widow spiders live in dry, warm areas. Shake out boots and clothes before you put them on.',
        ],
        wrongExplanation: [
          'Bu oddiy odat chaqishdan saqlaydi. Poyabzalni chodir ichida saqlang.',
          'Эта простая привычка спасает от укусов. Храните обувь внутри палатки.',
          'This simple habit prevents stings. Keep your boots inside the tent.',
        ],
      },
      {
        prompt: [
          'Ari chaqdi va yuz shishib, nafas qiyinlashdi. Bu nima?',
          'После укуса осы отекает лицо и трудно дышать. Что это?',
          'After a wasp sting the face swells and breathing is hard. What is it?',
        ],
        answer: [
          'Ogʻir allergik reaksiya — darhol 112 ga qoʻngʻiroq qilish',
          'Тяжёлая аллергия — сразу звонить 112',
          'A severe allergic reaction — call 112 at once',
        ],
        wrong: [
          [
            'Oddiy holat, oʻtib ketadi',
            'Обычное дело, пройдёт',
            'Normal, it will pass',
          ],
          [
            'Faqat muz qoʻyish yetarli',
            'Достаточно приложить лёд',
            'Ice alone is enough',
          ],
          ['Yurishni davom ettirish', 'Продолжать идти', 'Keep hiking'],
        ],
        explanation: [
          'Yuz, til shishishi va nafas qisishi hayot uchun xavfli. Agar odamda adrenalin avto-injektori boʻlsa, undan foydalanishga yordam bering.',
          'Отёк лица, языка и одышка опасны для жизни. Если у человека есть автоинъектор адреналина, помогите им воспользоваться.',
          'Swelling of the face or tongue and trouble breathing are life-threatening. If the person carries an adrenaline auto-injector, help them use it.',
        ],
        wrongExplanation: [
          'Nafas qiyinlashsa, kutmang. Bu shoshilinch holat.',
          'Если трудно дышать — не ждите. Это неотложное состояние.',
          'If breathing is hard, do not wait. This is an emergency.',
        ],
      },
    ],
  },
  {
    tierKey: '2',
    icon: 'first-aid',
    title: ['Birinchi yordam I', 'Первая помощь I', 'First aid I'],
    questions: [
      {
        prompt: [
          'Jarohatlangan odamni koʻrdingiz. Avval nima qilasiz?',
          'Вы видите пострадавшего. Что сделать сначала?',
          'You see an injured person. What do you do first?',
        ],
        hint: [
          'Ikkinchi jabrlanuvchi boʻlmang.',
          'Не станьте вторым пострадавшим.',
          'Do not become a second casualty.',
        ],
        answer: [
          'Joy oʻzim uchun xavfsizligini tekshirish',
          'Убедиться, что место безопасно для меня',
          'Check the scene is safe for me',
        ],
        wrong: [
          [
            'Darhol yugurib borish',
            'Сразу бежать к нему',
            'Run straight to them',
          ],
          ['Suratga olish', 'Сфотографировать', 'Take a photo'],
          [
            'Uni darhol koʻtarish',
            'Сразу его поднять',
            'Lift them up straight away',
          ],
        ],
        explanation: [
          'Tosh tushishi, tik qiyalik yoki oqim sizga ham xavf soladi. Avval xavfni baholang, keyin yaqinlashing.',
          'Камнепад, крутой склон или течение опасны и для вас. Сначала оцените опасность, потом подходите.',
          'Rockfall, a steep slope or a river can hurt you too. Check for danger first, then approach.',
        ],
        wrongExplanation: [
          'Shoshib borgan qutqaruvchi koʻpincha oʻzi jarohat oladi. Avval atrofga qarang.',
          'Спасатель, бросившийся без оглядки, часто сам получает травму. Сначала осмотритесь.',
          'Rescuers who rush in often get hurt themselves. Look around first.',
        ],
      },
      {
        prompt: [
          '112 ga qoʻngʻiroq qilganda eng muhimi nima?',
          'Что важнее всего сказать, позвонив в 112?',
          'What matters most when you call 112?',
        ],
        answer: [
          'Aniq joylashuv, nima boʻlgani va jabrlanganlar soni',
          'Точное место, что случилось и сколько пострадавших',
          'Exact location, what happened and how many are hurt',
        ],
        wrong: [
          ['Faqat ismingiz', 'Только ваше имя', 'Only your name'],
          ['Sayohat tarixi', 'История поездки', 'The story of your trip'],
          [
            'Darhol goʻshakni qoʻyish',
            'Сразу положить трубку',
            'Hang up quickly',
          ],
        ],
        explanation: [
          'Telefondagi GPS koordinatalarini ayting. Dispetcher ruxsat bermaguncha goʻshakni qoʻymang.',
          'Назовите GPS-координаты из телефона. Не кладите трубку, пока диспетчер не разрешит.',
          'Read out the GPS coordinates from your phone. Stay on the line until the dispatcher says you can hang up.',
        ],
        wrongExplanation: [
          'Qutqaruvchilar sizni topishi kerak. Joylashuv — eng muhim maʼlumot.',
          'Спасателям нужно вас найти. Место — самое важное.',
          'Rescuers need to find you. Location comes first.',
        ],
      },
      {
        prompt: [
          'Odam javob bermayapti, lekin normal nafas olyapti. Nima qilasiz?',
          'Человек без сознания, но нормально дышит. Что делать?',
          'A person is unresponsive but breathing normally. What do you do?',
        ],
        hint: [
          'Nafas yoʻlini ochiq saqlash kerak.',
          'Нужно держать дыхательные пути открытыми.',
          'Keep the airway open.',
        ],
        answer: [
          'Yon tomonga, xavfsiz holatga yotqizib, 112 ga qoʻngʻiroq qilish',
          'Уложить в устойчивое боковое положение и звонить 112',
          'Put them in the recovery position and call 112',
        ],
        wrong: [
          ['Oʻtirgʻizib qoʻyish', 'Усадить', 'Sit them up'],
          [
            'Yuziga suv sepib, yolgʻiz qoldirish',
            'Брызнуть водой и оставить одного',
            'Splash water and leave them alone',
          ],
          [
            'Ogʻziga suv quyish',
            'Влить воду в рот',
            'Pour water into their mouth',
          ],
        ],
        explanation: [
          'Yon holatda til nafas yoʻlini yopmaydi, qusuq ham chiqib ketadi. Nafasni doimiy kuzatib turing.',
          'В боковом положении язык не перекрывает дыхание, а рвота не попадает в лёгкие. Постоянно следите за дыханием.',
          'On their side, the tongue cannot block the airway and vomit can drain. Keep checking their breathing.',
        ],
        wrongExplanation: [
          'Hushsiz odamga suv bermang va yolgʻiz qoldirmang. Yon holat va nafasni kuzatish kerak.',
          'Не давайте воду человеку без сознания и не оставляйте одного. Боковое положение и контроль дыхания.',
          'Never give water to an unresponsive person or leave them. Recovery position and keep watching breathing.',
        ],
      },
      {
        prompt: [
          'Oyogʻingizda ishqalanish sezdingiz. Qachon chora koʻrasiz?',
          'Вы почувствовали натирание на ноге. Когда действовать?',
          'You feel a hot spot rubbing on your foot. When do you act?',
        ],
        answer: [
          'Darhol toʻxtab, plastir yopishtirish',
          'Сразу остановиться и наклеить пластырь',
          'Stop right away and put on a plaster',
        ],
        wrong: [
          ['Kechqurun lagerda', 'Вечером в лагере', 'In the evening at camp'],
          [
            'Pufak yorilganda',
            'Когда пузырь лопнет',
            'When the blister bursts',
          ],
          [
            'Hech qachon, oʻtib ketadi',
            'Никогда, само пройдёт',
            'Never, it will pass',
          ],
        ],
        explanation: [
          'Qizargan joy hali pufak emas. Erta yopishtirilgan plastir pufak chiqishining oldini oladi.',
          'Покраснение — ещё не пузырь. Пластырь, наклеенный сразу, не даст мозоли появиться.',
          'A red hot spot is not yet a blister. A plaster put on early stops one forming.',
        ],
        wrongExplanation: [
          'Kichik ishqalanish bir necha soatda ogʻriqli pufakka aylanadi. Darhol toʻxtang.',
          'Маленькое натирание за пару часов превращается в болезненную мозоль. Остановитесь сразу.',
          'A small rub becomes a painful blister within hours. Stop straight away.',
        ],
      },
      {
        prompt: [
          'Burundan qon ketyapti. Toʻgʻri harakat qaysi?',
          'Пошла кровь из носа. Как правильно?',
          'Someone has a nosebleed. What is right?',
        ],
        hint: ['Boshni orqaga emas.', 'Голову не назад.', 'Not head back.'],
        answer: [
          'Oldinga engashib, burunning yumshoq qismini 10–15 daqiqa siqish',
          'Наклониться вперёд и зажать мягкую часть носа на 10–15 минут',
          'Lean forward and pinch the soft part of the nose for 10–15 minutes',
        ],
        wrong: [
          [
            'Boshni orqaga tashlash',
            'Запрокинуть голову назад',
            'Tilt the head back',
          ],
          ['Yotib olish', 'Лечь на спину', 'Lie flat on the back'],
          ['Burunni tez-tez qoqish', 'Часто сморкаться', 'Blow the nose often'],
        ],
        explanation: [
          'Oldinga engashganda qon tomoqqa oqmaydi. Agar 20 daqiqadan keyin ham toʻxtamasa, tibbiy yordam soʻrang.',
          'При наклоне вперёд кровь не стекает в горло. Если через 20 минут не остановилась — обращайтесь за помощью.',
          'Leaning forward stops blood running down the throat. If it has not stopped after 20 minutes, get medical help.',
        ],
        wrongExplanation: [
          'Boshni orqaga tashlaganda qon yutiladi va qusish chaqiradi. Oldinga engashing.',
          'Если запрокинуть голову, кровь попадёт в желудок и вызовет рвоту. Наклонитесь вперёд.',
          'Tilting back makes you swallow blood, which can cause vomiting. Lean forward.',
        ],
      },
      {
        prompt: [
          'Gas gorelkadan qoʻl kuydi. Avval nima qilasiz?',
          'Обжёг руку о горелку. Что сделать сначала?',
          'You burn your hand on the gas stove. What first?',
        ],
        answer: [
          'Kuyikni 20 daqiqa salqin suv ostida tutish',
          'Охлаждать ожог прохладной водой 20 минут',
          'Cool it under cool water for 20 minutes',
        ],
        wrong: [
          ['Moy surtish', 'Намазать маслом', 'Put butter or oil on it'],
          [
            'Muzni toʻgʻridan-toʻgʻri qoʻyish',
            'Приложить лёд прямо к коже',
            'Put ice straight on it',
          ],
          ['Pufakni yorish', 'Проколоть пузырь', 'Pop the blister'],
        ],
        explanation: [
          'Salqin suv kuyishning chuqurlashishini toʻxtatadi. Keyin toza, yopishmaydigan bint bilan yengil yoping.',
          'Прохладная вода останавливает углубление ожога. Потом прикройте чистой неприлипающей повязкой.',
          'Cool water stops the burn getting deeper. Then cover it loosely with a clean non-stick dressing.',
        ],
        wrongExplanation: [
          'Moy issiqlikni ushlab qoladi, muz terini shikastlaydi. Faqat salqin suv.',
          'Масло удерживает жар, а лёд повреждает кожу. Только прохладная вода.',
          'Oil traps heat and ice damages skin. Use cool water only.',
        ],
      },
      {
        prompt: [
          'Koʻzga chang tushdi. Nima qilasiz?',
          'В глаз попала пыль. Что делать?',
          'Dust gets in your eye. What do you do?',
        ],
        hint: [
          'Ishqalash yomonlashtiradi.',
          'Трение только навредит.',
          'Rubbing makes it worse.',
        ],
        answer: [
          'Toza suv bilan yuvish',
          'Промыть чистой водой',
          'Rinse it with clean water',
        ],
        wrong: [
          ['Qattiq ishqalash', 'Сильно потереть', 'Rub it hard'],
          [
            'Barmoq bilan chiqarish',
            'Достать пальцем',
            'Pick it out with a finger',
          ],
          [
            'Koʻzni yumib, kun boʻyi yurish',
            'Зажмуриться и идти весь день',
            'Keep the eye shut all day',
          ],
        ],
        explanation: [
          'Ichimlik suvi bilan koʻzni burun tomondan tashqariga yuving. Ogʻriq oʻtmasa yoki koʻrish yomonlashsa, shifokorga boring.',
          'Промывайте глаз питьевой водой от носа наружу. Если боль не проходит или ухудшается зрение — к врачу.',
          'Rinse with drinking water from the nose side outwards. If pain stays or vision gets worse, see a doctor.',
        ],
        wrongExplanation: [
          'Ishqalash koʻz yuzasini tirnaydi. Suv bilan yuvish xavfsizroq.',
          'Трение царапает поверхность глаза. Промывание безопаснее.',
          'Rubbing scratches the eye surface. Rinsing is safer.',
        ],
      },
      {
        prompt: [
          'Suvsizlanish belgisi qaysi?',
          'Какой признак обезвоживания?',
          'Which is a sign of dehydration?',
        ],
        answer: [
          'Toʻq sariq siydik, bosh ogʻrigʻi, holsizlik',
          'Тёмная моча, головная боль, слабость',
          'Dark urine, headache and tiredness',
        ],
        wrong: [
          [
            'Koʻp terlash va tetiklik',
            'Обильный пот и бодрость',
            'Lots of sweat and feeling fresh',
          ],
          ['Ochiq rangli siydik', 'Светлая моча', 'Pale urine'],
          ['Ishtahaning oshishi', 'Повышенный аппетит', 'A bigger appetite'],
        ],
        explanation: [
          'Chanqoqni kutmay, oz-ozdan tez-tez iching. Issiqda tuz va shakar qoʻshilgan ichimlik yordam beradi.',
          'Не ждите жажды — пейте понемногу и часто. В жару помогают напитки с солью и сахаром.',
          'Do not wait for thirst; sip little and often. In heat, drinks with some salt and sugar help.',
        ],
        wrongExplanation: [
          'Ochiq rangli siydik — yaxshi belgi. Toʻq rang esa koʻproq ichish kerakligini bildiradi.',
          'Светлая моча — хороший знак, а тёмная говорит, что надо пить больше.',
          'Pale urine is a good sign; dark urine means drink more.',
        ],
      },
      {
        prompt: [
          'Sayohatda kim aptechkadan foydalanishni bilishi kerak?',
          'Кто в группе должен уметь пользоваться аптечкой?',
          'Who in the group should know how to use the first-aid kit?',
        ],
        hint: [
          'Yetakchi jarohatlansa-chi?',
          'А если пострадает сам руководитель?',
          'What if the leader is the one hurt?',
        ],
        answer: [
          'Iloji boricha hamma',
          'По возможности все',
          'Ideally everyone',
        ],
        wrong: [
          ['Faqat yetakchi', 'Только руководитель', 'Only the leader'],
          ['Hech kim, 112 bor', 'Никто, есть 112', 'Nobody, there is 112'],
          ['Faqat shifokorlar', 'Только врачи', 'Only doctors'],
        ],
        explanation: [
          'Togʻda yordam soatlab kelishi mumkin. Asosiy birinchi yordam kursi har bir sayyoh uchun foydali.',
          'В горах помощь может идти часами. Базовый курс первой помощи полезен каждому туристу.',
          'In the mountains help can take hours to arrive. A basic first-aid course is useful for every hiker.',
        ],
        wrongExplanation: [
          'Jarohat yetakchiga ham tushishi mumkin. Har kim asoslarni bilsin.',
          'Пострадать может и руководитель. Основы должен знать каждый.',
          'The leader can get hurt too. Everyone should know the basics.',
        ],
      },
      {
        prompt: [
          'Sayohat kuni ertalab oʻzingizni yomon his qilyapsiz. Nima qilasiz?',
          'Вы плохо себя чувствуете утром перед походом. Как быть?',
          'You feel unwell on the morning of a hike. What should you do?',
        ],
        answer: [
          'Uyda qolish yoki yengilroq marshrut tanlash',
          'Остаться дома или выбрать лёгкий маршрут',
          'Stay home or choose an easier route',
        ],
        wrong: [
          [
            'Dori ichib, rejadagidek chiqish',
            'Выпить таблетку и идти по плану',
            'Take a pill and go as planned',
          ],
          ['Guruhga aytmaslik', 'Не говорить группе', 'Do not tell the group'],
          [
            'Tezroq yurish, terlab tuzalish',
            'Идти быстрее, чтобы пропотеть',
            'Walk faster to sweat it out',
          ],
        ],
        explanation: [
          'Kasallik togʻda kuchayadi va butun guruhni xavf ostiga qoʻyadi. Togʻlar kutib turadi.',
          'В горах болезнь усиливается и ставит под угрозу всю группу. Горы подождут.',
          'Illness gets worse in the mountains and puts the whole group at risk. The mountains will wait.',
        ],
        wrongExplanation: [
          'Guruhga ochiq ayting. Bugun qolish — kuchli qaror.',
          'Скажите группе честно. Остаться сегодня — сильное решение.',
          'Tell the group honestly. Staying back today is a strong choice.',
        ],
      },
    ],
  },
  // ───────────────────────── Tier 3 ─────────────────────────
  {
    tierKey: '3',
    icon: 'mountain',
    title: [
      'Balandlik va salomatlik',
      'Высота и здоровье',
      'Altitude & health',
    ],
    questions: [
      {
        prompt: [
          'Balandlik kasalligining belgilarini sezsangiz, nima qilish kerak?',
          'Что делать, если вы заметили признаки горной болезни?',
          'What should you do if you notice signs of altitude sickness?',
        ],
        hint: [
          'Bosh ogʻrigʻi, koʻngil aynishi, bosh aylanishi… avval xavfsizlikni oʻylang!',
          'Головная боль, тошнота, головокружение… думайте о безопасности!',
          'Headache, nausea, dizziness… think safety first!',
        ],
        answer: [
          'Koʻtarilishni toʻxtatib, dam olish; yaxshilanmasa, pastga tushish',
          'Прекратить подъём и отдохнуть; если не легче — спускаться',
          'Stop climbing and rest; descend if it does not improve',
        ],
        wrong: [
          [
            'Tezroq yuqoriga chiqib, choʻqqini tugatish',
            'Быстрее подняться и закончить восхождение',
            'Climb faster to finish the summit',
          ],
          [
            'Ogʻriq qoldiruvchi ichib, davom etish',
            'Выпить обезболивающее и идти дальше',
            'Take a painkiller and keep going',
          ],
          [
            'Belgilarga eʼtibor bermaslik',
            'Не обращать внимания на симптомы',
            'Ignore the symptoms',
          ],
        ],
        explanation: [
          'Koʻtarilishni toʻxtatib, dam oling. Agar bir necha soatda belgilar yaxshilanmasa yoki kuchaysa, kamida 300–500 m pastga tushing. Belgilar bilan hech qachon yuqoriga chiqmang.',
          'Прекратите подъём и отдохните. Если за несколько часов симптомы не проходят или усиливаются, спуститесь минимум на 300–500 м. Никогда не идите выше с симптомами.',
          "Stop climbing and rest. If symptoms don't improve within a few hours — or get worse — descend at least 300–500 m. Never go higher with symptoms.",
        ],
        wrongExplanation: [
          'Koʻtarilishni toʻxtatib, dam oling; belgilar qolsa, pastga tushing. Shoshib yuqoriga chiqish balandlik kasalligini kuchaytiradi.',
          'Прекратите подъём и отдохните; если симптомы не проходят — спускайтесь. Спешка вверх усиливает горную болезнь.',
          'Stop ascending and rest; descend if symptoms persist. Rushing higher makes altitude sickness worse.',
        ],
      },
      {
        prompt: [
          'Balandlik kasalligi odatda qaysi balandlikdan boshlanishi mumkin?',
          'С какой высоты обычно может начаться горная болезнь?',
          'From what height can altitude sickness usually start?',
        ],
        answer: [
          'Taxminan 2500 metrdan',
          'Примерно с 2500 метров',
          'From about 2500 metres',
        ],
        wrong: [
          [
            'Faqat 6000 metrdan',
            'Только с 6000 метров',
            'Only from 6000 metres',
          ],
          ['Dengiz sathida', 'На уровне моря', 'At sea level'],
          ['Faqat Everestda', 'Только на Эвересте', 'Only on Everest'],
        ],
        explanation: [
          'Fan togʻlari va Chimyonning baland choʻqqilari bu chegaradan yuqori. Belgilar har kimda, hatto sportchilarda ham boʻlishi mumkin.',
          'Фанские горы и высокие вершины Чимгана выше этой отметки. Симптомы бывают у всех, даже у спортсменов.',
          "The Fann Mountains and Chimgan's higher peaks are above this line. Anyone, even very fit people, can get symptoms.",
        ],
        wrongExplanation: [
          'Balandlik kasalligi oʻrtacha balandlikda ham boshlanadi. Belgilarni kuzating.',
          'Горная болезнь начинается и на средних высотах. Следите за симптомами.',
          'Altitude sickness can start at moderate heights. Watch for the signs.',
        ],
      },
      {
        prompt: [
          'Balandlik kasalligining oldini olish uchun eng yaxshi usul qaysi?',
          'Как лучше всего предотвратить горную болезнь?',
          'What is the best way to prevent altitude sickness?',
        ],
        hint: [
          'Tanaga moslashish uchun vaqt kerak.',
          'Организму нужно время привыкнуть.',
          'Your body needs time to adjust.',
        ],
        answer: [
          'Sekin koʻtarilish va moslashish uchun vaqt berish',
          'Набирать высоту постепенно и давать время на акклиматизацию',
          'Climb slowly and give your body time to adjust',
        ],
        wrong: [
          [
            'Bir kunda iloji boricha baland chiqish',
            'За день подняться как можно выше',
            'Gain as much height as possible in one day',
          ],
          ['Spirtli ichimlik ichish', 'Выпить алкоголь', 'Drink alcohol'],
          ['Kam suv ichish', 'Пить меньше воды', 'Drink less water'],
        ],
        explanation: [
          '3000 metrdan yuqorida uxlash balandligini kuniga 300–500 metrdan koʻp oshirmang va har 3–4 kunda dam oling. Yetarli suv iching.',
          'Выше 3000 м поднимайте высоту ночёвки не более чем на 300–500 м в день и делайте день отдыха каждые 3–4 дня. Пейте достаточно воды.',
          'Above 3000 m, raise your sleeping height by no more than 300–500 m a day and take a rest day every 3–4 days. Drink enough water.',
        ],
        wrongExplanation: [
          'Tez koʻtarilish va spirtli ichimlik xavfni oshiradi. Sekin boring.',
          'Быстрый набор высоты и алкоголь повышают риск. Идите медленно.',
          'Fast ascent and alcohol raise the risk. Go slowly.',
        ],
      },
      {
        prompt: [
          'Doʻstingiz balandlikda chalkashib gapiryapti va gandiraklayapti. Bu nima?',
          'Друг на высоте путается в словах и шатается. Что это?',
          'At altitude your friend is confused and stumbling. What is this?',
        ],
        answer: [
          'Xavfli holat — darhol pastga tushish va 112 ga xabar berish',
          'Опасное состояние — немедленно спускаться и сообщить в 112',
          'A dangerous emergency — descend now and call 112',
        ],
        wrong: [
          ['Oddiy charchoq', 'Обычная усталость', 'Just tiredness'],
          ['Uxlab olsa oʻtadi', 'Выспится — пройдёт', 'Sleep will fix it'],
          [
            'Yuqoriga chiqishni davom ettirish mumkin',
            'Можно идти дальше вверх',
            'Fine to keep climbing',
          ],
        ],
        explanation: [
          'Chalkashlik va muvozanat yoʻqolishi miya shishi (HACE) belgisi boʻlishi mumkin. Bu hayot uchun xavfli. Darhol pastga tushing, uni yolgʻiz qoldirmang.',
          'Спутанность и потеря координации могут быть признаком отёка мозга (HACE). Это опасно для жизни. Немедленно спускайтесь и не оставляйте его одного.',
          'Confusion and loss of balance can mean brain swelling (HACE). It is life-threatening. Descend at once and never leave them alone.',
        ],
        wrongExplanation: [
          'Bu belgilarda kutish xavfli. Pastga tushish — eng muhim davo.',
          'При этих признаках ждать опасно. Спуск — главное лечение.',
          'Waiting is dangerous with these signs. Going down is the key treatment.',
        ],
      },
      {
        prompt: [
          'Dam olayotganda ham nafas qisishi va yoʻtal nimani bildirishi mumkin?',
          'О чём может говорить одышка в покое и кашель на высоте?',
          'What can breathlessness at rest and a cough at altitude mean?',
        ],
        hint: [
          'Bu oʻpka bilan bogʻliq.',
          'Это связано с лёгкими.',
          'It involves the lungs.',
        ],
        answer: [
          'Oʻpka shishi — darhol pastga tushish kerak',
          'Отёк лёгких — нужно сразу спускаться',
          'Fluid on the lungs — descend straight away',
        ],
        wrong: [
          ['Oddiy shamollash', 'Обычная простуда', 'A normal cold'],
          [
            'Yaxshi moslashish belgisi',
            'Признак хорошей акклиматизации',
            'A sign of good acclimatisation',
          ],
          ['Changdan', 'Это от пыли', 'Just dust'],
        ],
        explanation: [
          'Tinch holatda nafas qisishi oʻpka shishi (HAPE) belgisi boʻlishi mumkin. Pastga tushish va tibbiy yordam hayotni saqlaydi.',
          'Одышка в покое может быть признаком высотного отёка лёгких (HAPE). Спуск и медицинская помощь спасают жизнь.',
          'Breathlessness at rest can be a sign of high-altitude pulmonary oedema (HAPE). Descent and medical help save lives.',
        ],
        wrongExplanation: [
          'Balandlikda bu belgilar jiddiy. Pastga tushing va yordam chaqiring.',
          'На высоте эти признаки серьёзны. Спускайтесь и вызывайте помощь.',
          'At altitude these signs are serious. Go down and call for help.',
        ],
      },
      {
        prompt: [
          'Balandlikda nega koʻproq suv ichish kerak?',
          'Почему на высоте нужно больше пить?',
          'Why do you need more water at altitude?',
        ],
        answer: [
          'Quruq havo va tez nafas bilan koʻp suv yoʻqotiladi',
          'Сухой воздух и частое дыхание уносят много влаги',
          'Dry air and fast breathing make you lose more water',
        ],
        wrong: [
          [
            'Kerak emas, sovuqda chanqamaysiz',
            'Не нужно, в холоде пить не хочется',
            'You do not, you are not thirsty in the cold',
          ],
          [
            'Suv balandlik kasalligini darhol davolaydi',
            'Вода сразу лечит горную болезнь',
            'Water instantly cures altitude sickness',
          ],
          [
            'Suv ogʻirlik qiladi, kamroq olish kerak',
            'Вода тяжёлая, лучше брать меньше',
            'Water is heavy, take less',
          ],
        ],
        explanation: [
          'Suvsizlanish belgilari balandlik kasalligiga oʻxshaydi va uni yomonlashtiradi. Oz-ozdan, tez-tez iching.',
          'Обезвоживание похоже на горную болезнь и усиливает её. Пейте понемногу и часто.',
          'Dehydration feels like altitude sickness and makes it worse. Sip often.',
        ],
        wrongExplanation: [
          'Suv balandlik kasalligini davolamaydi, lekin suvsizlanish vaziyatni yomonlashtiradi.',
          'Вода не лечит горную болезнь, но обезвоживание её усугубляет.',
          'Water does not cure altitude sickness, but dehydration makes everything worse.',
        ],
      },
      {
        prompt: [
          '«Baland chiq, past uxla» qoidasi nimani anglatadi?',
          'Что значит правило «поднимайся высоко, спи низко»?',
          'What does "climb high, sleep low" mean?',
        ],
        hint: [
          'Moslashish haqida.',
          'Это про акклиматизацию.',
          'It is about acclimatisation.',
        ],
        answer: [
          'Kunduzi balandroqqa chiqib, tunashga pastroqqa tushish',
          'Днём подниматься выше, а ночевать ниже',
          'Go higher by day, then sleep lower down',
        ],
        wrong: [
          ['Choʻqqida tunash', 'Ночевать на вершине', 'Sleep on the summit'],
          ['Tunda koʻtarilish', 'Подниматься ночью', 'Climb at night'],
          ['Faqat pastda yurish', 'Ходить только внизу', 'Only walk low down'],
        ],
        explanation: [
          'Qisqa koʻtarilish tanani moslashtiradi, past joyda uxlash esa tiklanishga yordam beradi.',
          'Короткий подъём помогает организму привыкнуть, а сон ниже — восстановиться.',
          'A short trip up helps the body adapt, and sleeping lower helps it recover.',
        ],
        wrongExplanation: [
          'Bu moslashish usuli: kunduzi yuqoriga, tunda pastga.',
          'Это способ акклиматизации: днём выше, ночью ниже.',
          'It is an acclimatisation method: higher by day, lower at night.',
        ],
      },
      {
        prompt: [
          'Balandlikda spirtli ichimlik haqida nima toʻgʻri?',
          'Что верно про алкоголь на высоте?',
          'What is true about alcohol at altitude?',
        ],
        answer: [
          'Ichmaslik kerak: suvsizlantiradi va belgilarni yashiradi',
          'Лучше не пить: обезвоживает и маскирует симптомы',
          'Avoid it: it dehydrates you and hides symptoms',
        ],
        wrong: [
          [
            'Isitadi, shuning uchun foydali',
            'Согревает, значит полезен',
            'It warms you, so it helps',
          ],
          [
            'Uyquni yaxshilaydi',
            'Улучшает сон на высоте',
            'It improves sleep at altitude',
          ],
          [
            'Balandlik kasalligini davolaydi',
            'Лечит горную болезнь',
            'It treats altitude sickness',
          ],
        ],
        explanation: [
          'Spirtli ichimlik nafasni sekinlashtiradi, suvsizlantiradi va issiqlik yoʻqotilishini tezlashtiradi.',
          'Алкоголь замедляет дыхание, обезвоживает и ускоряет потерю тепла.',
          'Alcohol slows breathing, dehydrates you and speeds up heat loss.',
        ],
        wrongExplanation: [
          'Issiqlik hissi aldamchi: aslida tana tezroq soviydi.',
          'Ощущение тепла обманчиво: тело остывает быстрее.',
          'The warm feeling is false: your body loses heat faster.',
        ],
      },
      {
        prompt: [
          'Guruhda kimdir boshi ogʻriyapti, lekin uyalib aytmayapti. Nima qilish kerak?',
          'Кто-то в группе стесняется сказать о головной боли. Как быть?',
          'Someone in the group is embarrassed to mention a headache. What should happen?',
        ],
        hint: ['Bu zaiflik emas.', 'Это не слабость.', 'It is not weakness.'],
        answer: [
          'Guruh har kimni belgilar haqida ochiq aytishga undashi',
          'Группа поощряет честно говорить о симптомах',
          'The group encourages everyone to speak up about symptoms',
        ],
        wrong: [
          [
            'Jim yurish — kuchlilik belgisi',
            'Молчать — признак силы',
            'Staying silent shows strength',
          ],
          [
            'Faqat choʻqqidan keyin aytish',
            'Сказать только после вершины',
            'Mention it only after the summit',
          ],
          [
            'Ogʻriq qoldiruvchini yashirincha ichish',
            'Тайком выпить таблетку',
            'Secretly take a painkiller',
          ],
        ],
        explanation: [
          'Erta aytilgan belgi oddiy dam bilan hal boʻladi. Kech aytilsa, butun guruh uchun xavfli qutqaruvga aylanadi.',
          'О симптоме, сказанном вовремя, можно позаботиться простым отдыхом. Поздно — и это может стать опасной спасработой.',
          'A symptom mentioned early can be handled with rest. Mentioned late, it can turn into a risky rescue for everyone.',
        ],
        wrongExplanation: [
          'Belgilarni yashirish xavfli. Ochiq aytish — aqlli qaror.',
          'Скрывать симптомы опасно. Сказать честно — разумное решение.',
          'Hiding symptoms is risky. Speaking up is the smart choice.',
        ],
      },
      {
        prompt: [
          'Balandlikda tunda yomon uxlash va ishtaha yoʻqligi nimaning belgisi boʻlishi mumkin?',
          'О чём могут говорить плохой сон и отсутствие аппетита на высоте?',
          'What can poor sleep and no appetite at altitude be a sign of?',
        ],
        answer: [
          'Yengil balandlik kasalligi',
          'Лёгкой горной болезни',
          'Mild altitude sickness',
        ],
        wrong: [
          [
            'Yaxshi moslashish',
            'Хорошей акклиматизации',
            'Good acclimatisation',
          ],
          ['Ortiqcha ovqatlanish', 'Переедания', 'Eating too much'],
          [
            'Juda koʻp suv ichish',
            'Слишком большого количества воды',
            'Drinking too much water',
          ],
        ],
        explanation: [
          'Bular yengil belgilardir. Yuqoriga chiqmang, dam oling va kuzating. Kuchaysa, pastga tushing.',
          'Это лёгкие симптомы. Не поднимайтесь выше, отдохните и наблюдайте. Если хуже — спускайтесь.',
          'These are mild signs. Do not go higher; rest and watch. If they get worse, descend.',
        ],
        wrongExplanation: [
          'Bular balandlik belgilari boʻlishi mumkin. Ularga eʼtibor bering.',
          'Это могут быть признаки высоты. Обращайте на них внимание.',
          'These can be altitude signs. Pay attention to them.',
        ],
      },
    ],
  },
  {
    tierKey: '3',
    icon: 'compass',
    title: ['Yoʻl topish', 'Поиск маршрута', 'Route finding'],
    questions: [
      {
        prompt: [
          'Soʻqmoq yoʻqolib qoldi. Eng xavfsiz harakat qaysi?',
          'Тропа исчезла. Какое действие самое безопасное?',
          'The trail disappears. What is the safest move?',
        ],
        hint: [
          'Oxirgi ishonchli nuqtani eslang.',
          'Вспомните последнюю надёжную точку.',
          'Think of the last point you were sure of.',
        ],
        answer: [
          'Oxirgi tanish joyga qaytish',
          'Вернуться к последнему знакомому месту',
          'Go back to the last place you knew',
        ],
        wrong: [
          [
            'Toʻgʻriga davom etish',
            'Идти прямо дальше',
            'Keep going straight ahead',
          ],
          [
            'Toshlarga chiqib qarash',
            'Залезть на скалы посмотреть',
            'Climb onto rocks to look',
          ],
          [
            'Qisqa yoʻl bilan pastga tushish',
            'Спуститься напрямик',
            'Take a shortcut down',
          ],
        ],
        explanation: [
          'Oxirgi tanish nuqtadan yoʻlni qayta topish oson. Notanish joyda davom etish adashishni chuqurlashtiradi.',
          'От последней известной точки проще снова найти тропу. Идти дальше по незнакомому месту — значит потеряться сильнее.',
          'From the last known point it is easier to find the trail again. Pushing on into the unknown gets you more lost.',
        ],
        wrongExplanation: [
          'Notanish yoʻl jarlik yoki tik qiyalikka olib borishi mumkin. Orqaga qayting.',
          'Незнакомый путь может вывести к обрыву. Возвращайтесь.',
          'An unknown way can lead to cliffs. Go back.',
        ],
      },
      {
        prompt: [
          'Adashganda soy boʻylab pastga tushish nega xavfli boʻlishi mumkin?',
          'Почему спуск вдоль ручья, когда заблудился, бывает опасен?',
          'Why can following a stream downhill be dangerous when lost?',
        ],
        answer: [
          'Soylar koʻpincha sharshara va tik jarliklarga olib boradi',
          'Ручьи часто ведут к водопадам и обрывам',
          'Streams often lead to waterfalls and cliffs',
        ],
        wrong: [
          [
            'Soy suvi juda iliq',
            'Вода в ручье слишком тёплая',
            'The water is too warm',
          ],
          [
            'Soylar doim qishloqqa olib boradi',
            'Ручьи всегда приводят в село',
            'Streams always lead to villages',
          ],
          [
            'Xavfli emas, bu eng yaxshi usul',
            'Не опасно, это лучший способ',
            'It is not dangerous, it is the best way',
          ],
        ],
        explanation: [
          'Togʻ soylari tor daralar va sharsharalarga tushadi. Maʼlum soʻqmoqqa qayting yoki joyingizda qolib, yordam chaqiring.',
          'Горные ручьи уходят в узкие ущелья и водопады. Возвращайтесь на известную тропу или оставайтесь на месте и вызывайте помощь.',
          'Mountain streams drop into narrow gorges and waterfalls. Return to a known trail, or stay put and call for help.',
        ],
        wrongExplanation: [
          'Togʻda soy har doim xavfsiz yoʻl emas. Tik joylarga duch kelishingiz mumkin.',
          'В горах ручей — не всегда безопасный путь. Можно выйти к обрыву.',
          'In the mountains a stream is not always a safe route. It can end at a drop.',
        ],
      },
      {
        prompt: [
          'Toshdan yigʻilgan kichik minoralar (turlar) nimani bildiradi?',
          'Что означают небольшие пирамидки из камней (туры)?',
          'What do small stacked-stone piles (cairns) mean?',
        ],
        hint: [
          'Ular yoʻlni koʻrsatadi.',
          'Они указывают путь.',
          'They point the way.',
        ],
        answer: [
          'Yoʻl belgisi, lekin xarita bilan tekshirish kerak',
          'Это метка пути, но сверяйтесь с картой',
          'A route marker, but check it with your map',
        ],
        wrong: [
          ['Bu xavfli joy belgisi', 'Это знак опасного места', 'A danger sign'],
          [
            'Bular bezak, ahamiyatsiz',
            'Это украшение, без смысла',
            'Just decoration',
          ],
          [
            'Ularni buzish kerak',
            'Их нужно разрушать',
            'They should be knocked down',
          ],
        ],
        explanation: [
          'Turlar yoʻlni koʻrsatadi, lekin baʼzan boshqa marshrutga olib boradi. Doim xaritangiz bilan solishtiring.',
          'Туры отмечают путь, но иногда ведут на другой маршрут. Всегда сверяйтесь с картой.',
          'Cairns mark a route, but sometimes a different one. Always compare with your map.',
        ],
        wrongExplanation: [
          'Turlar foydali belgi. Ularni buzmang, lekin koʻr-koʻrona ham ergashmang.',
          'Туры — полезная метка. Не разрушайте их, но и не идите слепо.',
          'Cairns are useful markers. Do not knock them down, but do not follow them blindly.',
        ],
      },
      {
        prompt: [
          'Tik qum-tosh (surma) yonbagʻridan qisqa yoʻl bilan tushish haqida nima toʻgʻri?',
          'Что верно про спуск напрямик по крутой осыпи?',
          'What is true about shortcutting down a steep scree slope?',
        ],
        answer: [
          'Xavfli: tosh qulashi va yiqilish ehtimoli yuqori',
          'Опасно: высокий риск камнепада и падения',
          'Risky: high chance of rockfall and falls',
        ],
        wrong: [
          [
            'Doim tezroq va xavfsizroq',
            'Всегда быстрее и безопаснее',
            'Always faster and safer',
          ],
          ['Yugurib tushsa boʻladi', 'Можно сбежать бегом', 'Fine to run down'],
          [
            'Faqat yomgʻirda xavfli',
            'Опасно только в дождь',
            'Only risky in rain',
          ],
        ],
        explanation: [
          'Surmadagi toshlar siljiydi va pastdagilarga tushadi. Soʻqmoqdan, zigzag boʻylab tushing.',
          'Камни на осыпи сдвигаются и летят на тех, кто ниже. Спускайтесь по тропе серпантином.',
          'Scree moves and sends rocks onto people below. Descend on the trail and its zigzags.',
        ],
        wrongExplanation: [
          'Qisqa yoʻl koʻpincha uzoqroq va xavfliroq boʻlib chiqadi.',
          'Короткий путь часто оказывается дольше и опаснее.',
          'Shortcuts often end up longer and more dangerous.',
        ],
      },
      {
        prompt: [
          'Qaytish vaqti nima?',
          'Что такое контрольное время возврата?',
          'What is a turn-around time?',
        ],
        hint: [
          'Choʻqqidan oldin belgilanadi.',
          'Его назначают заранее.',
          'You set it in advance.',
        ],
        answer: [
          'Qayerda boʻlsangiz ham ortga qaytadigan oldindan belgilangan soat',
          'Заранее назначенный час, когда вы поворачиваете назад, где бы ни были',
          'A set time when you turn back, wherever you are',
        ],
        wrong: [
          [
            'Choʻqqiga yetadigan vaqt',
            'Время, когда вы дойдёте до вершины',
            'The time you reach the summit',
          ],
          [
            'Uyga qaytadigan vaqt',
            'Время прихода домой',
            'The time you get home',
          ],
          ['Tushlik vaqti', 'Время обеда', 'Lunchtime'],
        ],
        explanation: [
          'Qaytish vaqti qorongʻi tushmasdan va momaqaldiroqdan oldin xavfsiz tushishga imkon beradi. Uni oldindan belgilang va unga rioya qiling.',
          'Время возврата позволяет спуститься засветло и до грозы. Назначайте его заранее и соблюдайте.',
          'A turn-around time gets you down before dark and before storms. Set it in advance and stick to it.',
        ],
        wrongExplanation: [
          'Bu choʻqqiga yetish vaqti emas. Bu — qayerda boʻlsangiz ham qaytish vaqti.',
          'Это не время на вершине. Это час, когда поворачивают назад, где бы вы ни были.',
          'It is not the summit time. It is when you turn back, wherever you are.',
        ],
      },
      {
        prompt: [
          'Koʻtarilishda dara (kuluar) va tizma oʻrtasida tanlov bor. Qaysi biri koʻpincha tosh qulashiga moyil?',
          'На подъёме выбор между кулуаром и гребнем. Где чаще камнепад?',
          'Climbing, you choose between a gully and a ridge. Which usually has more rockfall?',
        ],
        answer: ['Dara (kuluar)', 'Кулуар', 'The gully'],
        wrong: [
          ['Tizma', 'Гребень', 'The ridge'],
          ['Ikkalasi bir xil', 'Одинаково', 'Both the same'],
          ['Hech birida boʻlmaydi', 'Ни там, ни там', 'Neither has rockfall'],
        ],
        explanation: [
          'Daralar toshlarni pastga yigʻadi. Kerak boʻlsa, tez, bir-biridan uzoqda va kaska kiyib oʻting.',
          'Кулуары собирают падающие камни. Если идёте там — быстро, с интервалом и в каске.',
          'Gullies funnel falling rocks. If you must use one, move quickly, spaced apart and wearing a helmet.',
        ],
        wrongExplanation: [
          'Tosh qulashi darada koʻproq. Darada uzoq turmang.',
          'Камнепады чаще в кулуарах. Не задерживайтесь там.',
          'Rockfall is more common in gullies. Do not linger there.',
        ],
      },
      {
        prompt: [
          'GPS trekni qanday ishlatish toʻgʻri?',
          'Как правильно пользоваться GPS-треком?',
          'What is the right way to use a GPS track?',
        ],
        hint: [
          'Trek — yordamchi, lekin koÊ»z ham kerak.',
          'Трек — помощник, но смотреть тоже нужно.',
          'The track helps, but you still need to look.',
        ],
        answer: [
          'Uni tez-tez tekshirib, atrof bilan solishtirish',
          'Часто сверяться и сравнивать с местностью',
          'Check it often and compare with the terrain',
        ],
        wrong: [
          [
            'Faqat adashganda ochish',
            'Открывать, только когда заблудился',
            'Only open it when lost',
          ],
          [
            'Atrofga qaramay, faqat ekranga qarab yurish',
            'Идти, глядя только в экран',
            'Walk looking only at the screen',
          ],
          [
            'Trek doim toʻgʻri, tekshirish shart emas',
            'Трек всегда верный',
            'The track is always right',
          ],
        ],
        explanation: [
          'Tez-tez tekshirsangiz, xatoni erta sezasiz. Baʼzi treklar eskirgan yoki xavfli joydan oʻtadi.',
          'Частая проверка позволяет заметить ошибку рано. Некоторые треки устарели или проходят по опасным местам.',
          'Checking often catches mistakes early. Some tracks are old or cross dangerous ground.',
        ],
        wrongExplanation: [
          'Trek va atrofni birga ishlating. Ekranga koʻr-koʻrona ishonmang.',
          'Используйте трек вместе с местностью. Не верьте экрану вслепую.',
          'Use the track together with the terrain. Do not trust the screen blindly.',
        ],
      },
      {
        prompt: [
          'Kech tushyapti, mashinagacha hali uzoq. Nima qilasiz?',
          'Темнеет, а до машины ещё далеко. Что делать?',
          'It is getting dark and the car is still far. What do you do?',
        ],
        answer: [
          'Fonarni yoqib, tanish soʻqmoqdan sekin davom etish',
          'Включить фонари и спокойно идти по знакомой тропе',
          'Turn on headlamps and continue slowly on the known trail',
        ],
        wrong: [
          [
            'Yugurib, qisqa yoʻldan tushish',
            'Бежать напрямик',
            'Run down a shortcut',
          ],
          [
            'Guruhni boʻlib, tezroq yurganlar oldinga ketish',
            'Разделиться, быстрые уйдут вперёд',
            'Split up so the fast ones go ahead',
          ],
          [
            'Qorongʻida fonarsiz yurish',
            'Идти в темноте без света',
            'Walk in the dark without light',
          ],
        ],
        explanation: [
          'Qorongʻida xato qilish oson. Guruh bilan birga, tanish yoʻldan yuring. Kerak boʻlsa, uydagi odamga kechikishingizni xabar qiling.',
          'В темноте легко ошибиться. Держитесь вместе и идите по знакомой тропе. При возможности предупредите близких об опоздании.',
          'Mistakes are easy in the dark. Stay together on the known trail. If you can, tell your contact at home you will be late.',
        ],
        wrongExplanation: [
          'Shoshilish va boʻlinish qorongʻida xavfni oshiradi.',
          'Спешка и разделение в темноте повышают риск.',
          'Rushing and splitting up in the dark raise the risk.',
        ],
      },
      {
        prompt: [
          'Notanish hududga borishdan oldin nima qilish foydali?',
          'Что полезно сделать перед походом в незнакомый район?',
          'What helps before hiking in an unfamiliar area?',
        ],
        hint: [
          'Boshqalar tajribasidan foydalaning.',
          'Используйте чужой опыт.',
          "Use other people's experience.",
        ],
        answer: [
          'Marshrut tavsifini oʻqib, mahalliy sharoitni oʻrganish',
          'Изучить описание маршрута и местные условия',
          'Study the route description and local conditions',
        ],
        wrong: [
          [
            'Hech narsa, joyda koʻramiz',
            'Ничего, на месте разберёмся',
            'Nothing, we will see when we get there',
          ],
          [
            'Faqat chiroyli suratlarni koʻrish',
            'Посмотреть только красивые фото',
            'Only look at nice photos',
          ],
          [
            'Eng qiyin marshrutni tanlash',
            'Выбрать самый сложный вариант',
            'Pick the hardest route',
          ],
        ],
        explanation: [
          'Masofa, balandlik, suv manbalari va xavfli joylarni oldindan bilish rejani xavfsizroq qiladi.',
          'Знать заранее расстояние, набор высоты, источники воды и опасные участки — значит сделать план безопаснее.',
          'Knowing the distance, height gain, water sources and hazards in advance makes the plan safer.',
        ],
        wrongExplanation: [
          'Tayyorgarlik — xavfsizlikning yarmi. Marshrutni oʻrganing.',
          'Подготовка — половина безопасности. Изучите маршрут.',
          'Preparation is half of safety. Study the route.',
        ],
      },
      {
        prompt: [
          'Koʻtarilganda yoʻlning qaysi tomoni qulayroq ekanini tushunmadingiz. Kim bilan maslahatlashasiz?',
          'Неясно, какой путь удобнее. С кем советоваться?',
          'You are unsure which way is better. Who do you decide with?',
        ],
        answer: [
          'Butun guruh bilan, toʻxtab va xaritaga qarab',
          'Со всей группой, остановившись и посмотрев на карту',
          'With the whole group, stopped and looking at the map',
        ],
        wrong: [
          [
            'Hech kim bilan, oldinga ketaman',
            'Ни с кем, пойду вперёд один',
            'Nobody, I go ahead alone',
          ],
          ['Tanga tashlab', 'Подброшу монетку', 'Flip a coin'],
          [
            'Eng tez yuradigan odam hal qiladi',
            'Решит самый быстрый',
            'Whoever is fastest decides',
          ],
        ],
        explanation: [
          'Birgalikda qaror qilish xatolarni kamaytiradi va hech kim yolgʻiz qolmaydi.',
          'Совместное решение уменьшает ошибки, и никто не остаётся один.',
          'Deciding together reduces mistakes and nobody ends up alone.',
        ],
        wrongExplanation: [
          'Yolgʻiz ketish va tasodifiy tanlov xavfli. Guruh bilan toʻxtab maslahatlashing.',
          'Уходить одному и выбирать наугад опасно. Остановитесь и решите вместе.',
          'Going alone or choosing at random is risky. Stop and decide together.',
        ],
      },
    ],
  },
  {
    tierKey: '3',
    icon: 'waves',
    title: ['Daryodan oʻtish', 'Переправа через реку', 'River crossing'],
    questions: [
      {
        prompt: [
          'Togʻ daryolari qachon eng xavfli?',
          'Когда горные реки опаснее всего?',
          'When are mountain rivers most dangerous?',
        ],
        hint: [
          'Qor erishini oʻylang.',
          'Подумайте о таянии снега.',
          'Think about snowmelt.',
        ],
        answer: [
          'Bahor va yoz boshida, qor erigan paytda',
          'Весной и в начале лета, во время таяния снега',
          'In spring and early summer, during snowmelt',
        ],
        wrong: [
          ['Faqat qishda', 'Только зимой', 'Only in winter'],
          ['Kuzning oxirida', 'Поздней осенью', 'In late autumn'],
          [
            'Hech qachon xavfli emas',
            'Никогда не опасны',
            'They are never dangerous',
          ],
        ],
        explanation: [
          'Aprel–iyunda Chotqol, Piskom va Ugam daryolari qor suvi bilan toʻladi. Suv juda sovuq, tez va kuchli boʻladi.',
          'В апреле–июне реки Чаткала, Пскема и Угама полны талой воды. Она очень холодная, быстрая и сильная.',
          'From April to June the Chatkal, Pskem and Ugam rivers fill with snowmelt. The water is icy, fast and powerful.',
        ],
        wrongExplanation: [
          'Bahorda qor erishi bilan suv koʻtariladi. Bu davrda ayniqsa ehtiyot boʻling.',
          'Весной с таянием снега вода поднимается. В это время будьте особенно осторожны.',
          'Water rises with spring snowmelt. Take extra care at that time of year.',
        ],
      },
      {
        prompt: [
          'Qor suvi bilan toʻladigan soydan kunning qaysi vaqtida oʻtgan maʼqul?',
          'В какое время дня лучше переходить ручей с талой водой?',
          'When in the day is it best to cross a snowmelt stream?',
        ],
        answer: ['Erta tongda', 'Рано утром', 'Early in the morning'],
        wrong: [
          ['Tushdan keyin', 'После обеда', 'In the afternoon'],
          ['Kechqurun', 'Вечером', 'In the evening'],
          ['Farqi yoʻq', 'Без разницы', 'It makes no difference'],
        ],
        explanation: [
          'Tunda sovuqda qor kamroq eriydi, shuning uchun ertalab suv pastroq. Kunduzi quyosh qorni eritib, suvni koʻtaradi.',
          'Ночью холодно и снег тает меньше, поэтому утром вода ниже. Днём солнце растапливает снег, и уровень растёт.',
          "Less snow melts in the cold night, so the water is lower in the morning. The day's sun melts snow and the level rises.",
        ],
        wrongExplanation: [
          'Kunduzgi issiqlikdan keyin suv eng baland boʻladi. Ertalab oʻting.',
          'После дневного тепла вода самая высокая. Переходите утром.',
          "After the day's warmth the water is highest. Cross in the morning.",
        ],
      },
      {
        prompt: [
          'Oʻtish uchun qanday joy tanlanadi?',
          'Какое место выбрать для переправы?',
          'What kind of place do you choose to cross?',
        ],
        hint: [
          'Suv tezligiga qarang.',
          'Смотрите на скорость воды.',
          'Look at the speed of the water.',
        ],
        answer: [
          'Keng, sayoz va oqimi sekin joy',
          'Широкое, мелкое место с медленным течением',
          'A wide, shallow, slow-moving section',
        ],
        wrong: [
          ['Eng tor joy', 'Самое узкое место', 'The narrowest point'],
          [
            'Sharsharadan biroz yuqorisi',
            'Чуть выше водопада',
            'Just above a waterfall',
          ],
          [
            'Suv shovqin bilan oqayotgan joy',
            'Где вода шумит сильнее всего',
            'Where the water is loudest',
          ],
        ],
        explanation: [
          'Tor joyda suv chuqurroq va tezroq. Pastda tosh, sharshara yoki tiqilgan daraxtlar boʻlmasligini ham tekshiring.',
          'В узком месте вода глубже и быстрее. Проверьте, чтобы ниже не было порогов, водопада или завалов.',
          'Narrow spots are deeper and faster. Also check there are no rapids, falls or log jams below.',
        ],
        wrongExplanation: [
          'Tor va shovqinli joy kuchli oqimni bildiradi. Keng, tinch joyni qidiring.',
          'Узкое и шумное место — признак сильного течения. Ищите широкое и спокойное.',
          'Narrow and loud means strong current. Look for a wide, calm stretch.',
        ],
      },
      {
        prompt: [
          'Suv tizzadan baland va tez oqyapti. Nima qilasiz?',
          'Вода выше колена и течёт быстро. Что делать?',
          'The water is above the knee and fast. What do you do?',
        ],
        answer: [
          'Oʻtmaslik: boshqa joy qidirish yoki qaytish',
          'Не переходить: искать другое место или вернуться',
          'Do not cross: find another place or turn back',
        ],
        wrong: [
          ['Yugurib oʻtish', 'Перебежать бегом', 'Run across'],
          [
            'Arqonni belga bogʻlab oʻtish',
            'Привязать верёвку к поясу и идти',
            'Tie a rope round your waist and go',
          ],
          [
            'Bitta odam sinab koʻrsin',
            'Пусть кто-то один попробует',
            'Let one person try first',
          ],
        ],
        explanation: [
          'Tez oqimda tizzadan baland suv odamni yiqitib olib ketishi mumkin. Hech qanday choʻqqi bunga arzimaydi.',
          'Быстрая вода выше колена может сбить с ног и унести. Ни одна вершина этого не стоит.',
          'Fast water above the knee can knock you down and carry you away. No summit is worth it.',
        ],
        wrongExplanation: [
          'Belga bogʻlangan arqon odamni suv ostiga tortishi mumkin. Xavfli oqimdan oʻtmang.',
          'Привязанная к телу верёвка может утянуть под воду. Не переходите опасный поток.',
          'A rope tied to your body can pull you under. Do not cross dangerous water.',
        ],
      },
      {
        prompt: [
          'Oʻtishdan oldin ryukzak tasmalarini nima qilish kerak?',
          'Что сделать с ремнями рюкзака перед переправой?',
          'What do you do with your backpack straps before crossing?',
        ],
        hint: [
          'Yiqilsangiz, ryukzakdan tez qutulish kerak.',
          'Если упадёте, рюкзак нужно быстро сбросить.',
          'If you fall, you need to drop the pack fast.',
        ],
        answer: [
          'Bel va koʻkrak tasmalarini yechib qoʻyish',
          'Расстегнуть поясной и грудной ремни',
          'Unclip the hip belt and chest strap',
        ],
        wrong: [
          ['Mahkamroq tortish', 'Затянуть потуже', 'Tighten them'],
          [
            'Ryukzakni boshga qoʻyish',
            'Поднять рюкзак на голову',
            'Carry the pack on your head',
          ],
          ['Farqi yoʻq', 'Неважно', 'It does not matter'],
        ],
        explanation: [
          'Yiqilsangiz, bogʻlangan ryukzak sizni suv ostiga tortishi mumkin. Tasmalar yechiq boʻlsa, uni tez tashlaysiz.',
          'При падении пристёгнутый рюкзак может утянуть под воду. С расстёгнутыми ремнями его легко сбросить.',
          'If you fall, a buckled pack can hold you under. With straps open you can slip it off fast.',
        ],
        wrongExplanation: [
          'Mahkam tasmalar suvda xavfli. Oʻtishdan oldin ularni yeching.',
          'Затянутые ремни в воде опасны. Расстегните их перед переправой.',
          'Tight straps are dangerous in water. Undo them before you cross.',
        ],
      },
      {
        prompt: [
          'Daryodan oʻtishda poyabzal haqida nima toʻgʻri?',
          'Что верно про обувь при переправе?',
          'What is true about footwear when crossing?',
        ],
        answer: [
          'Poyabzal yoki suv sandaliyasida oʻtish',
          'Переходить в обуви или в сандалиях для воды',
          'Cross in shoes or water sandals',
        ],
        wrong: [
          ['Yalangoyoq oʻtish', 'Переходить босиком', 'Cross barefoot'],
          ['Paypoqda oʻtish', 'Переходить в носках', 'Cross in socks'],
          ['Shippakda oʻtish', 'Переходить в шлёпанцах', 'Cross in flip-flops'],
        ],
        explanation: [
          'Daryo tubidagi toshlar sirpanchiq va oʻtkir. Poyabzal oyoqni himoya qiladi va muvozanatni saqlaydi.',
          'Камни на дне скользкие и острые. Обувь защищает ноги и помогает держать равновесие.',
          'Riverbed stones are slippery and sharp. Shoes protect your feet and help your balance.',
        ],
        wrongExplanation: [
          'Yalangoyoq yoki shippakda oyoq jarohatlanadi va sirpanadi.',
          'Босиком или в шлёпанцах легко поранить ногу и поскользнуться.',
          'Barefoot or in flip-flops you can cut your feet and slip.',
        ],
      },
      {
        prompt: [
          'Oqimda qanday yurish kerak?',
          'Как правильно двигаться в потоке?',
          'How should you move in the current?',
        ],
        hint: [
          'Uchta tayanch nuqta.',
          'Три точки опоры.',
          'Three points of support.',
        ],
        answer: [
          'Oqimga qarab, tayoqlarga tayanib, kichik qadamlar bilan',
          'Лицом против течения, опираясь на палки, мелкими шагами',
          'Face upstream, lean on poles and take small steps',
        ],
        wrong: [
          [
            'Oqim boʻyicha yuz oʻgirib, katta qadamlar bilan',
            'Спиной к течению, большими шагами',
            'Back to the current, with big steps',
          ],
          [
            'Toshdan toshga sakrab',
            'Прыгая с камня на камень',
            'Jumping from rock to rock',
          ],
          [
            'Pastga qarab, tez yurib',
            'Глядя вниз, быстро',
            'Fast, looking down at the water',
          ],
        ],
        explanation: [
          'Oqimga qarab tursangiz, tizzalar bukilmaydi. Tayoqlar uchinchi tayanch boʻladi. Har qadamdan oldin oyoqni mahkam qoʻying.',
          'Лицом к течению колени не подгибаются, палки дают третью точку опоры. Ставьте ногу надёжно перед каждым шагом.',
          'Facing upstream keeps your knees from buckling and poles give extra support. Place each foot firmly before the next step.',
        ],
        wrongExplanation: [
          'Sakrash va katta qadamlar suvda yiqilishga olib keladi.',
          'Прыжки и широкие шаги в воде ведут к падению.',
          'Jumping and long strides in water lead to falls.',
        ],
      },
      {
        prompt: [
          'Guruh bilan qanday oʻtish xavfsizroq?',
          'Как безопаснее переходить группой?',
          'How is it safer to cross as a group?',
        ],
        answer: [
          'Bir-birini ushlab, birga oʻtish',
          'Держась друг за друга, вместе',
          'Together, holding on to each other',
        ],
        wrong: [
          [
            'Har kim alohida, yugurib',
            'Каждый сам по себе, бегом',
            'Each person alone, running',
          ],
          [
            'Eng yengil odam birinchi, yolgʻiz',
            'Первым в одиночку самый лёгкий',
            'The lightest person first, alone',
          ],
          [
            'Bolalarni yolgʻiz yuborish',
            'Отправить детей одних',
            'Send children across alone',
          ],
        ],
        explanation: [
          'Bir-birini ushlab yoki ryukzak tasmasidan tutib turgan guruh barqarorroq. Eng kuchli odam oqim tomonida turadi.',
          'Группа, держащаяся друг за друга или за лямки рюкзаков, устойчивее. Самый сильный встаёт выше по течению.',
          "A group holding each other or each other's pack straps is more stable. The strongest person stands on the upstream side.",
        ],
        wrongExplanation: [
          'Yolgʻiz odam oqimga osonroq yiqiladi. Birga, ushlashib oʻting.',
          'Одного человека поток сбивает легче. Переходите вместе, держась друг за друга.',
          'One person alone is easier for the current to topple. Cross together, linked up.',
        ],
      },
      {
        prompt: [
          'Oqim sizni olib ketdi. Nima qilasiz?',
          'Вас сбило и несёт течением. Что делать?',
          'The current sweeps you away. What do you do?',
        ],
        hint: ['Oyoqlar oldinda.', 'Ноги впереди.', 'Feet first.'],
        answer: [
          'Chalqancha, oyoqlarni oldinga qilib suzish, keyin qiyalab qirgʻoqqa',
          'Лечь на спину ногами вперёд, затем грести наискосок к берегу',
          'Float on your back feet first, then swim at an angle to the bank',
        ],
        wrong: [
          [
            'Oqimga qarshi suzish',
            'Плыть против течения',
            'Swim against the current',
          ],
          [
            'Turib olishga urinish',
            'Пытаться встать на ноги',
            'Try to stand up',
          ],
          ['Toshni quchoqlab olish', 'Обхватить камень', 'Hug a rock'],
        ],
        explanation: [
          'Oyoqlar oldinda boʻlsa, toshlarga bosh bilan urilmaysiz. Tez oqimda turishga urinish oyoqni toshlar orasiga qistirib qoʻyishi mumkin.',
          'Ногами вперёд вы отталкиваетесь от камней, а не бьётесь головой. Попытка встать в быстром потоке может зажать ногу между камнями.',
          'Feet first, you push off rocks instead of hitting them with your head. Standing up in fast water can trap your foot between rocks.',
        ],
        wrongExplanation: [
          'Oqimga qarshi suzish kuchni tugatadi. Oqim bilan, qiyalab qirgʻoqqa harakat qiling.',
          'Борьба с течением отнимает силы. Двигайтесь с потоком наискосок к берегу.',
          'Fighting the current wears you out. Go with it, angling towards the bank.',
        ],
      },
      {
        prompt: [
          'Koʻprik yoki xavfsiz oʻtish joyi uzoqroqda. Nima qilasiz?',
          'Мост или безопасный брод дальше по пути. Как быть?',
          'A bridge or safe ford is further away. What do you do?',
        ],
        answer: [
          'Uzoqroq boʻlsa ham, xavfsiz joydan oʻtish',
          'Пройти дольше, но переправиться в безопасном месте',
          'Walk further and cross at the safe place',
        ],
        wrong: [
          [
            'Vaqtni tejash uchun shu yerdan oʻtish',
            'Перейти здесь, чтобы сэкономить время',
            'Cross here to save time',
          ],
          [
            'Daraxt tanasi ustidan yugurib oʻtish',
            'Перебежать по бревну',
            'Run across a log',
          ],
          ['Sakrab oʻtish', 'Перепрыгнуть', 'Jump across'],
        ],
        explanation: [
          'Qoʻshimcha bir soat yurish xavfli oʻtishdan yaxshiroq. Hoʻl daraxt tanasi juda sirpanchiq.',
          'Лишний час пути лучше рискованной переправы. Мокрое бревно очень скользкое.',
          'An extra hour of walking beats a risky crossing. Wet logs are very slippery.',
        ],
        wrongExplanation: [
          'Tejalgan vaqt xavfga arzimaydi. Xavfsiz joyni tanlang.',
          'Сэкономленное время не стоит риска. Выбирайте безопасное место.',
          'Saved time is not worth the risk. Choose the safe place.',
        ],
      },
    ],
  },
  // ───────────────────────── Tier 4 ─────────────────────────
  {
    tierKey: '4',
    icon: 'avalanche',
    title: [
      'Qor koʻchkisidan ehtiyot boʻlish',
      'Лавинная безопасность',
      'Avalanche awareness',
    ],
    questions: [
      {
        prompt: [
          'Qor koʻchkilarining aksariyatini kim keltirib chiqaradi?',
          'Кто вызывает большинство лавин, в которые попадают люди?',
          'Who triggers most avalanches that catch people?',
        ],
        hint: [
          'Javob sizni hayratlantirishi mumkin.',
          'Ответ может удивить.',
          'The answer may surprise you.',
        ],
        answer: [
          'Koʻchkiga tushgan odamlarning oʻzi yoki ularning guruhi',
          'Сами пострадавшие или их группа',
          'The victims themselves or their group',
        ],
        wrong: [
          ['Faqat zilzila', 'Только землетрясения', 'Only earthquakes'],
          ['Faqat baland ovoz', 'Только громкий крик', 'Only loud shouting'],
          ['Faqat samolyotlar', 'Только самолёты', 'Only aircraft'],
        ],
        explanation: [
          'Koʻchkiga tushganlarning koʻpchiligi uni oʻz ogʻirligi bilan qoʻzgʻatgan. Shuning uchun qaysi qiyalikka chiqishni tanlash juda muhim.',
          'Большинство попавших в лавину сами её и подрезали своим весом. Поэтому выбор склона так важен.',
          'Most people caught in avalanches set them off with their own weight. That is why choosing the slope matters so much.',
        ],
        wrongExplanation: [
          'Baqiriq koʻchkini deyarli qoʻzgʻatmaydi. Asosiy sabab — qiyalikdagi odam ogʻirligi.',
          'Крик почти никогда не вызывает лавину. Главная причина — вес человека на склоне.',
          "Shouting almost never starts an avalanche. The main cause is a person's weight on the slope.",
        ],
      },
      {
        prompt: [
          'Qaysi qiyalikda koʻchki koʻproq tushadi?',
          'На каких склонах чаще всего сходят лавины?',
          'Which slopes most often avalanche?',
        ],
        answer: [
          'Taxminan 30–45 gradusli qiyaliklar',
          'На склонах примерно 30–45 градусов',
          'Slopes of about 30–45 degrees',
        ],
        wrong: [
          ['Faqat tekis joylar', 'Только на ровных местах', 'Only flat ground'],
          [
            'Faqat 10 gradusdan kam',
            'Только на склонах меньше 10 градусов',
            'Only slopes under 10 degrees',
          ],
          [
            'Faqat tik qoyalar',
            'Только на отвесных скалах',
            'Only vertical cliffs',
          ],
        ],
        explanation: [
          'Bu qiyaliklarda qor yetarlicha toʻplanadi va oson siljiydi. Pastdagi joylar ham koʻchki yoʻlida boʻlishi mumkin.',
          'На таких склонах снег и накапливается, и легко сползает. Места под ними тоже могут оказаться на пути лавины.',
          'Snow builds up on these slopes and slides easily. Ground below them can also be in the path.',
        ],
        wrongExplanation: [
          'Eng xavfli qiyalik 30–45 gradus. Ularning tagida ham ehtiyot boʻling.',
          'Самые опасные — 30–45 градусов. Будьте осторожны и под ними.',
          'The most dangerous slopes are 30–45 degrees. Take care below them too.',
        ],
      },
      {
        prompt: [
          'Qaysi biri koʻchki xavfi belgisi?',
          'Что из этого — признак лавинной опасности?',
          'Which of these is an avalanche warning sign?',
        ],
        hint: [
          'Qor sizga «gapiradi».',
          'Снег «говорит» с вами.',
          'The snow is talking to you.',
        ],
        answer: [
          'Qor ostidan «gup» degan ovoz va yorilishlar',
          '«Ухающий» звук и трещины в снегу',
          'A "whumpf" sound and cracks shooting through the snow',
        ],
        wrong: [
          [
            'Quyoshli va sovuq kun',
            'Солнечный морозный день',
            'A sunny, frosty day',
          ],
          ['Qorning juda kamligi', 'Очень мало снега', 'Very little snow'],
          ['Qushlar sayrashi', 'Пение птиц', 'Birdsong'],
        ],
        explanation: [
          '«Gup» ovozi va yorilishlar qor qatlami beqarorligini bildiradi. Shuningdek, yaqinda tushgan koʻchkilar, koʻp yangi qor va tez isish ham xavf belgisi.',
          '«Уханье» и трещины говорят о неустойчивом снеге. Тревожные признаки — также свежие лавины, много нового снега и резкое потепление.',
          'Whumpfs and cracks mean the snowpack is unstable. Recent avalanches, lots of new snow and fast warming are warning signs too.',
        ],
        wrongExplanation: [
          'Bu belgilarni sezsangiz, darhol xavfsiz, qiya boʻlmagan joyga qayting.',
          'Заметив эти признаки, сразу уходите на безопасный пологий рельеф.',
          'If you notice these signs, go back to safe, gentle ground at once.',
        ],
      },
      {
        prompt: [
          'Qishki togʻ sayohatida har bir ishtirokchida nima boʻlishi kerak?',
          'Что должно быть у каждого участника зимнего выхода в лавиноопасные горы?',
          'What should each person carry in avalanche terrain?',
        ],
        answer: [
          'Koʻchki datchigi, zond, kurak va ulardan foydalanish koʻnikmasi',
          'Лавинный датчик, щуп, лопата и умение ими пользоваться',
          'A transceiver, probe, shovel and the training to use them',
        ],
        wrong: [
          ['Faqat telefon', 'Только телефон', 'Just a phone'],
          ['Faqat issiq choy', 'Только горячий чай', 'Only hot tea'],
          ['Faqat changʻi', 'Только лыжи', 'Only skis'],
        ],
        explanation: [
          'Koʻchkiga tushgan odamni faqat sheriklari tez topa oladi. Uchala jihoz va mashq qilish koʻnikmasi bir-birisiz ishlamaydi.',
          'Быстро найти засыпанного могут только спутники. Три предмета работают только вместе и только с навыком.',
          'Only companions can find a buried person fast. The three tools work only together, and only with practice.',
        ],
        wrongExplanation: [
          'Telefon koʻchki ostidagi odamni topa olmaydi. Datchik, zond va kurak kerak.',
          'Телефон не найдёт человека под снегом. Нужны датчик, щуп и лопата.',
          'A phone cannot find someone under the snow. You need a transceiver, probe and shovel.',
        ],
      },
      {
        prompt: [
          'Chimyonda qishda sayohatdan oldin nimani tekshirasiz?',
          'Что проверить перед зимним выходом в Чимгане?',
          'What do you check before a winter hike in Chimgan?',
        ],
        hint: [
          'Rasmiy ogohlantirishlar bor.',
          'Есть официальные предупреждения.',
          'There are official warnings.',
        ],
        answer: [
          'Koʻchki xavfi haqida rasmiy ogohlantirish va prognozni',
          'Официальные лавинные предупреждения и прогноз',
          'Official avalanche warnings and the forecast',
        ],
        wrong: [
          [
            'Faqat restoranlar ish vaqtini',
            'Только часы работы кафе',
            'Only café opening hours',
          ],
          ['Hech narsani', 'Ничего', 'Nothing'],
          [
            'Faqat ijtimoiy tarmoqdagi suratlarni',
            'Только фото в соцсетях',
            'Only photos on social media',
          ],
        ],
        explanation: [
          'Kuchli qor yogʻishi yoki isishdan keyin xavf oshadi. Ogohlantirish boʻlsa, xavfsiz, qiya boʻlmagan marshrut tanlang yoki uyda qoling.',
          'После сильных снегопадов и потеплений опасность растёт. Если есть предупреждение — выбирайте пологий маршрут или оставайтесь дома.',
          'Danger rises after heavy snow or warming. If there is a warning, choose a gentle route or stay home.',
        ],
        wrongExplanation: [
          'Ijtimoiy tarmoq surati xavfni koʻrsatmaydi. Rasmiy maʼlumotga tayaning.',
          'Фото в соцсетях не показывают опасность. Опирайтесь на официальную информацию.',
          'Social media photos do not show the danger. Rely on official information.',
        ],
      },
      {
        prompt: [
          'Xavfli qiyalikni kesib oʻtish kerak. Qanday qilasiz?',
          'Нужно пересечь опасный склон. Как?',
          'You must cross a risky slope. How?',
        ],
        answer: [
          'Birma-bir, qolganlar xavfsiz joydan kuzatadi',
          'По одному, остальные наблюдают из безопасного места',
          'One at a time, while others watch from a safe spot',
        ],
        wrong: [
          [
            'Hammasi birga, tez',
            'Все вместе и быстро',
            'All together, quickly',
          ],
          [
            'Toʻxtab dam olish oʻrtasida',
            'Отдохнуть посередине склона',
            'Stop to rest in the middle',
          ],
          [
            'Sakrab, qorni sinab koʻrish',
            'Попрыгать, чтобы проверить снег',
            'Jump to test the snow',
          ],
        ],
        explanation: [
          'Birma-bir oʻtilsa, qiyalikka kamroq ogʻirlik tushadi va koʻchki boʻlsa, faqat bitta odam xavf ostida, qolganlar qutqara oladi.',
          'По одному — меньше нагрузка на склон, и в случае лавины под ней один человек, а остальные могут спасать.',
          'One at a time means less weight on the slope, and if it slides only one person is caught while the others can rescue.',
        ],
        wrongExplanation: [
          'Hammasi birga boʻlsa, qutqaradigan odam qolmaydi.',
          'Если все вместе, спасать будет некому.',
          'If everyone is on the slope, nobody is left to rescue.',
        ],
      },
      {
        prompt: [
          'Koʻchki sizni olib ketyapti. Nima qilasiz?',
          'Вас захватила лавина. Что делать?',
          'An avalanche catches you. What do you do?',
        ],
        hint: [
          'Yon tomonga va yuqoriga.',
          'В сторону и наверх.',
          'Sideways and up.',
        ],
        answer: [
          'Chetga chiqishga urinish va yuzada qolish uchun kurashish',
          'Пытаться уйти в сторону и бороться, чтобы остаться на поверхности',
          'Try to get to the side and fight to stay on the surface',
        ],
        wrong: [
          [
            'Koʻzni yumib, bushashish',
            'Закрыть глаза и расслабиться',
            'Close your eyes and relax',
          ],
          [
            'Koʻchkidan oldinda pastga yugurish',
            'Бежать вниз впереди лавины',
            'Run straight downhill ahead of it',
          ],
          ['Baqirish', 'Кричать', 'Shout'],
        ],
        explanation: [
          'Toʻxtashdan oldin bir qoʻlni yuzga qoʻyib, havo boʻshligʻi yarating va iloji boʻlsa, ikkinchi qoʻlni yuqoriga choʻzing.',
          'Перед остановкой прикройте лицо рукой, чтобы создать воздушный карман, а другую руку по возможности вытяните вверх.',
          'Before it stops, put one hand in front of your face to make an air space and push the other hand up if you can.',
        ],
        wrongExplanation: [
          'Koʻchkidan qochib boʻlmaydi. Chetga harakat qiling va yuzada qolishga urining.',
          'От лавины не убежать. Уходите в сторону и держитесь на поверхности.',
          'You cannot outrun an avalanche. Move sideways and stay on top.',
        ],
      },
      {
        prompt: [
          'Sherigingiz koʻchki ostida qoldi. Avval nima qilasiz?',
          'Спутника засыпало лавиной. Что делать первым?',
          'A companion is buried. What do you do first?',
        ],
        answer: [
          '112 ga qisqa qoʻngʻiroq qilib, darhol qidirishni boshlash',
          'Коротко позвонить 112 и сразу начать поиск',
          'Make a quick 112 call and start searching at once',
        ],
        wrong: [
          [
            'Yordam uchun pastga ketish',
            'Уйти вниз за помощью',
            'Go down for help',
          ],
          ['Qutqaruvchilarni kutish', 'Ждать спасателей', 'Wait for rescuers'],
          ['Ertaga qaytib kelish', 'Вернуться завтра', 'Come back tomorrow'],
        ],
        explanation: [
          'Koʻchki ostidagi odamni dastlabki 15 daqiqada topish hayot saqlash imkoniyatini keskin oshiradi. Qutqaruvchilar uchun kutish juda uzoq.',
          'Найти засыпанного в первые 15 минут — главный шанс на спасение. Ждать спасателей слишком долго.',
          'Finding a buried person in the first 15 minutes gives the best chance of survival. Waiting for rescuers takes too long.',
        ],
        wrongExplanation: [
          'Vaqt eng muhim. Joyida qidiring — siz eng yaqin qutqaruvchisiz.',
          'Время решает всё. Ищите на месте — вы ближайший спасатель.',
          'Time is everything. Search on the spot — you are the closest rescuer.',
        ],
      },
      {
        prompt: [
          'Yangi qor qalin yogʻgandan keyingi kun haqida nima toʻgʻri?',
          'Что верно про день после сильного снегопада?',
          'What is true about the day after heavy snowfall?',
        ],
        hint: [
          'Yangi qor hali joylashmagan.',
          'Свежий снег ещё не улёгся.',
          'Fresh snow has not settled yet.',
        ],
        answer: [
          'Koʻchki xavfi yuqori — qiya joylardan uzoq turish',
          'Лавинная опасность высокая — держаться подальше от склонов',
          'Avalanche danger is high — stay off and away from steep slopes',
        ],
        wrong: [
          [
            'Eng yaxshi kun, qor yumshoq',
            'Лучший день, снег мягкий',
            'Best day out, the snow is soft',
          ],
          ['Xavf yoʻq', 'Опасности нет', 'There is no danger'],
          [
            'Faqat kechqurun xavfli',
            'Опасно только вечером',
            'Only dangerous in the evening',
          ],
        ],
        explanation: [
          'Yangi qor eski qatlamga hali yopishmagan, shamol esa uni qiyaliklarga uyadi. Qor bir necha kun joylashishi kerak.',
          'Новый снег ещё не сцепился со старым, а ветер надувает его на склоны. Снегу нужно несколько дней, чтобы улечься.',
          'New snow has not bonded to the old layers, and wind piles it on slopes. It needs a few days to settle.',
        ],
        wrongExplanation: [
          'Yumshoq qor chiroyli, lekin xavfli. Tekis va oʻrmonli joylarni tanlang.',
          'Мягкий снег красив, но опасен. Выбирайте пологий рельеф.',
          'Soft snow is lovely but dangerous. Choose gentle terrain.',
        ],
      },
      {
        prompt: [
          'Qaysi joy «tuzoq relyef» hisoblanadi?',
          'Что называют «ловушкой рельефа»?',
          'What is a "terrain trap"?',
        ],
        answer: [
          'Qor chuqur toʻplanadigan soy yoki tor dara',
          'Узкий лог или ущелье, где снег скапливается глубоко',
          'A gully or narrow ravine where snow piles up deep',
        ],
        wrong: [
          ['Keng tekis yaylov', 'Широкое ровное плато', 'A wide flat meadow'],
          [
            'Shamoldan himoyalangan lager',
            'Защищённый от ветра лагерь',
            'A sheltered camp',
          ],
          ['Avtomobil yoʻli', 'Автодорога', 'A road'],
        ],
        explanation: [
          'Kichik koʻchki ham tor darada odamni chuqur koʻmib yuboradi. Bunday joylarda dam olmang va qor koʻp boʻlsa, ulardan qoching.',
          'Даже маленькая лавина в узком логу засыпает глубоко. Не останавливайтесь там и избегайте таких мест при большом снеге.',
          'Even a small avalanche can bury someone deep in a gully. Do not rest there, and avoid such places when snow is deep.',
        ],
        wrongExplanation: [
          'Tuzoq relyef — bu qor yigʻiladigan tor joy. Undan uzoq turing.',
          'Ловушка рельефа — узкое место, где копится снег. Держитесь в стороне.',
          'A terrain trap is a narrow place where snow collects. Keep away from it.',
        ],
      },
    ],
  },
  {
    tierKey: '4',
    icon: 'mountain',
    title: ['Qoyalarda harakat', 'Лазание по скалам', 'Scrambling'],
    questions: [
      {
        prompt: [
          'Qoyada «uch tayanch nuqta» qoidasi nimani anglatadi?',
          'Что значит правило «трёх точек опоры» на скалах?',
          'What does the "three points of contact" rule mean?',
        ],
        hint: [
          'Ikki qoʻl, ikki oyoq.',
          'Две руки, две ноги.',
          'Two hands, two feet.',
        ],
        answer: [
          'Bir vaqtda faqat bitta qoʻl yoki oyoqni qimirlatish',
          'Двигать одновременно только одну руку или ногу',
          'Move only one hand or foot at a time',
        ],
        wrong: [
          [
            'Uch kishi birga chiqadi',
            'Лезут втроём',
            'Three people climb together',
          ],
          ['Uch marta dam olish', 'Три раза отдыхать', 'Rest three times'],
          [
            'Ikki qoʻlni birga qimirlatish',
            'Перехватывать сразу обеими руками',
            'Move both hands at once',
          ],
        ],
        explanation: [
          'Uchta nuqta qoyada qolsa, bitta tayanch sirpansa ham ushlanib qolasiz.',
          'Пока три точки на скале, вы удержитесь, даже если одна опора сорвётся.',
          'With three points on the rock, you stay on even if one hold slips.',
        ],
        wrongExplanation: [
          'Har doim uchta tayanch bilan qoyada boʻling. Bir harakatda faqat bitta aʼzo.',
          'Всегда три точки опоры. Одно движение — одна конечность.',
          'Always keep three points on the rock. One limb moves at a time.',
        ],
      },
      {
        prompt: [
          'Tosh ushlagichni qanday tekshirasiz?',
          'Как проверить зацеп перед тем, как на него встать?',
          'How do you check a hold before using it?',
        ],
        answer: [
          'Avval qoʻl bilan urib yoki bosib koʻrish',
          'Сначала постучать или надавить рукой',
          'Tap or press it first before trusting it',
        ],
        wrong: [
          [
            'Butun ogʻirlik bilan sakrab',
            'Прыгнуть на него всем весом',
            'Jump on it with full weight',
          ],
          ['Tekshirish shart emas', 'Проверять не нужно', 'No need to check'],
          [
            'Faqat kattasini tanlash, u doim mustahkam',
            'Брать только большие — они всегда прочные',
            'Pick only big holds, they are always solid',
          ],
        ],
        explanation: [
          'Katta toshlar ham boʻsh boʻlishi mumkin. Ushlagich qimirlasa yoki boʻsh ovoz chiqarsa, boshqasini tanlang.',
          'Даже крупные камни бывают живыми. Если зацеп шатается или звучит пусто — ищите другой.',
          'Even big blocks can be loose. If a hold moves or sounds hollow, find another.',
        ],
        wrongExplanation: [
          'Tekshirilmagan ushlagich yiqilish va tosh qulashiga olib keladi.',
          'Непроверенный зацеп — путь к срыву и камнепаду.',
          'An untested hold can lead to a fall or rockfall.',
        ],
      },
      {
        prompt: [
          'Qoyali marshrutda kaska nimaga kerak?',
          'Зачем каска на скальном маршруте?',
          'Why wear a helmet on a scramble?',
        ],
        hint: [
          'Xavf faqat pastda emas.',
          'Опасность не только внизу.',
          'Danger is not only below you.',
        ],
        answer: [
          'Yuqoridan tushadigan toshlardan va yiqilishdan himoya',
          'Защищает от падающих сверху камней и при падении',
          'It protects from falling rocks and in a fall',
        ],
        wrong: [
          [
            'Faqat chiroyli koʻrinish uchun',
            'Только для красоты',
            'Only to look good',
          ],
          [
            'Quyoshdan himoya uchun',
            'Для защиты от солнца',
            'To keep the sun off',
          ],
          [
            'Faqat professionallar uchun',
            'Только для профессионалов',
            'Only for professionals',
          ],
        ],
        explanation: [
          'Toshlarni yuqoridagi odamlar, hayvonlar yoki shamol qoʻzgʻatadi. Kaska yengil va hayotni saqlaydi.',
          'Камни сбрасывают люди выше, животные или ветер. Каска лёгкая и спасает жизни.',
          'Rocks get knocked down by people above, animals or wind. A helmet is light and saves lives.',
        ],
        wrongExplanation: [
          'Tosh qulashi har kimga tegishi mumkin. Kaska — oddiy himoya.',
          'Камень может прилететь любому. Каска — простая защита.',
          'A falling rock can hit anyone. A helmet is simple protection.',
        ],
      },
      {
        prompt: [
          'Tosh qulab, pastda odamlar bor. Nima qilasiz?',
          'Сорвался камень, а внизу люди. Что делать?',
          'A rock falls and people are below. What do you do?',
        ],
        answer: [
          'Baland ovozda «Tosh!» deb baqirish',
          'Громко крикнуть «Камень!»',
          'Shout "Rock!" loudly',
        ],
        wrong: [
          ['Jim turish', 'Промолчать', 'Stay quiet'],
          ['Faqat qoʻl silkitish', 'Только помахать рукой', 'Just wave'],
          [
            'Pastga tushib, kechirim soʻrash',
            'Спуститься и извиниться',
            'Climb down and apologise',
          ],
        ],
        explanation: [
          'Ogohlantirish pastdagilarga panaga yashirinish yoki qoyaga yopishish uchun vaqt beradi. «Tosh!» eshitsangiz, yuqoriga qaramang.',
          'Крик даёт людям внизу секунды, чтобы укрыться или прижаться к скале. Услышав «Камень!», не смотрите вверх.',
          'The shout gives people below time to take cover or hug the rock. If you hear "Rock!", do not look up.',
        ],
        wrongExplanation: [
          'Jim turish pastdagilarni ogohlantirmaydi. Doim baland baqiring.',
          'Молчание не предупредит тех, кто внизу. Всегда кричите громко.',
          'Silence warns nobody below. Always shout loudly.',
        ],
      },
      {
        prompt: [
          'Qaysi qoida pastga tushish haqida eng muhim?',
          'Какое правило про спуск самое важное?',
          'Which rule about descending is most important?',
        ],
        hint: [
          'Yuqoriga chiqish yarim yoʻl.',
          'Подъём — только половина пути.',
          'Going up is only half the way.',
        ],
        answer: [
          'Tusha olmaydigan joyga chiqmaslik',
          'Не залезать туда, откуда не сможешь слезть',
          'Do not climb what you cannot climb down',
        ],
        wrong: [
          [
            'Pastga tushish doim oson',
            'Спуск всегда проще',
            'Going down is always easier',
          ],
          [
            'Yuqoriga chiqsangiz, yoʻl topiladi',
            'Залезешь — найдёшь путь',
            'Once up, a way down will appear',
          ],
          [
            'Pastga sakrab tushish mumkin',
            'Можно спрыгнуть',
            'You can jump down',
          ],
        ],
        explanation: [
          'Pastga tushish koʻpincha qiyinroq, chunki ushlagichlar koʻrinmaydi. Har harakatdan oldin qaytishni oʻylang.',
          'Спускаться часто труднее: зацепов не видно. Перед каждым шагом вверх думайте, как вернётесь.',
          'Climbing down is often harder because you cannot see the holds. Before each move up, think about coming back.',
        ],
        wrongExplanation: [
          'Koʻp odamlar yuqorida tiqilib qoladi. Qaytish yoʻlini oldindan biling.',
          'Многие застревают наверху. Знайте путь обратно заранее.',
          'Many people get stuck up high. Know your way back in advance.',
        ],
      },
      {
        prompt: [
          'Yomgʻirdan keyin qoyalarda harakat haqida nima toʻgʻri?',
          'Что верно про скалы после дождя?',
          'What is true about scrambling after rain?',
        ],
        answer: [
          'Hoʻl tosh sirpanchiq — kechiktirish yoki boshqa yoʻl tanlash',
          'Мокрый камень скользкий — отложить или выбрать другой путь',
          'Wet rock is slippery — wait or choose another route',
        ],
        wrong: [
          [
            'Hoʻl tosh yaxshiroq ushlaydi',
            'Мокрый камень держит лучше',
            'Wet rock grips better',
          ],
          ['Farqi yoʻq', 'Разницы нет', 'No difference'],
          ['Tezroq chiqish kerak', 'Нужно лезть быстрее', 'Climb faster'],
        ],
        explanation: [
          'Hoʻl qoya, ayniqsa mox yoki oʻt bilan qoplangan boʻlsa, juda sirpanchiq. Quruq boʻlguncha kuting.',
          'Мокрая скала, особенно с мхом или травой, очень скользкая. Подождите, пока высохнет.',
          'Wet rock, especially with moss or grass, is very slippery. Wait for it to dry.',
        ],
        wrongExplanation: [
          'Hoʻl qoyada sirpanish oson. Shoshmang.',
          'На мокрых скалах легко соскользнуть. Не спешите.',
          'It is easy to slip on wet rock. Do not hurry.',
        ],
      },
      {
        prompt: [
          'Qoyali joyda trekking tayoqlarini nima qilasiz?',
          'Что делать с треккинговыми палками на скальном участке?',
          'What do you do with trekking poles on a scramble?',
        ],
        hint: [
          'Qoʻllar boʻsh boʻlishi kerak.',
          'Руки должны быть свободны.',
          'Your hands need to be free.',
        ],
        answer: [
          'Ryukzakka mahkamlab qoʻyish',
          'Закрепить на рюкзаке',
          'Strap them to your pack',
        ],
        wrong: [
          [
            'Qoʻlda ushlab chiqish',
            'Лезть, держа их в руках',
            'Climb holding them',
          ],
          ['Pastga tashlab yuborish', 'Сбросить вниз', 'Throw them down'],
          ['Tishda ushlash', 'Держать в зубах', 'Hold them in your teeth'],
        ],
        explanation: [
          'Qoyada ikki qoʻl ham ushlash uchun kerak. Tayoqlarni mahkamlang, ular toshga ilinmasin.',
          'На скалах нужны обе руки. Закрепите палки, чтобы они не цеплялись за камни.',
          'You need both hands on rock. Secure the poles so they do not snag.',
        ],
        wrongExplanation: [
          'Qoʻldagi tayoq muvozanatni buzadi. Ularni ryukzakka qoʻying.',
          'Палки в руках мешают держать равновесие. Уберите их на рюкзак.',
          'Poles in hand upset your balance. Put them on your pack.',
        ],
      },
      {
        prompt: [
          'Guruh qoyali darada qanday harakatlanadi?',
          'Как группа движется по скальному кулуару?',
          'How does a group move up a rocky gully?',
        ],
        answer: [
          'Bir-birining tagida emas, tosh boshqalarga tushmaydigan qilib',
          'Не друг под другом, так чтобы камни не летели на других',
          'Not directly below each other, so rocks miss those beneath',
        ],
        wrong: [
          [
            'Bir qatorda, ketma-ket tagma-tag',
            'Цепочкой строго друг под другом',
            'In a line, right below each other',
          ],
          [
            'Uzoq oraliqda, bir-birini koʻrmay',
            'Так далеко, что друг друга не видно',
            'So far apart nobody can see each other',
          ],
          [
            'Pastdagilar tez yuqoriga yugurishi',
            'Нижние быстро бегут вверх',
            'Those below run up fast',
          ],
        ],
        explanation: [
          'Har bir odam yuqoridagining tosh tushish yoʻlidan chetda boʻlsin yoki juda yaqin turib, tosh tezlik olmasin.',
          'Каждый должен быть в стороне от линии падения камней от верхнего или идти очень близко, чтобы камень не успел разогнаться.',
          'Stay out of the fall line of the person above, or so close that a dislodged rock cannot pick up speed.',
        ],
        wrongExplanation: [
          'Tagma-tag yurish tosh tushganda xavfli. Yon tomonga suring.',
          'Идти строго друг под другом опасно при камнепаде. Смещайтесь в сторону.',
          'Climbing directly below someone is risky if rocks fall. Move to the side.',
        ],
      },
      {
        prompt: [
          'Qoyali tik joydan tushganda qaysi holat xavfsizroq?',
          'Как безопаснее спускаться по крутым скалам?',
          'How is it safer to descend steep rock?',
        ],
        hint: [
          'Zinapoyadan qanday tushasiz?',
          'Как вы спускаетесь по стремянке?',
          'How do you go down a ladder?',
        ],
        answer: [
          'Qoyaga yuz bilan oʻgirilib',
          'Лицом к скале',
          'Facing the rock',
        ],
        wrong: [
          [
            'Orqa bilan qoyaga, yugurib',
            'Спиной к скале, бегом',
            'Back to the rock, running',
          ],
          ['Oʻtirib sirpanib', 'Съезжая сидя', 'Sliding on your bottom'],
          ['Sakrab', 'Прыжками', 'Jumping'],
        ],
        explanation: [
          'Tik joyda qoyaga qarab tushsangiz, qoʻl va oyoqlar ushlagichni yaxshi topadi.',
          'На крутом участке лицом к скале руки и ноги лучше находят опоры.',
          'On steep ground, facing the rock lets your hands and feet find holds.',
        ],
        wrongExplanation: [
          'Sakrash va sirpanish tik joyda yiqilishga olib keladi.',
          'Прыжки и съезды на крутом участке ведут к падению.',
          'Jumping and sliding on steep ground lead to falls.',
        ],
      },
      {
        prompt: [
          'Qoyali qismdan oldin birinchi marta qoʻrquv sezdingiz. Bu nimani bildiradi?',
          'Перед скальным участком вам впервые стало страшно. Что это значит?',
          'Before a rocky section you feel afraid for the first time. What does it mean?',
        ],
        answer: [
          'Toʻxtab, vaziyatni baholash va kerak boʻlsa qaytish uchun signal',
          'Сигнал остановиться, оценить ситуацию и при нужде повернуть',
          'A signal to stop, assess and turn back if needed',
        ],
        wrong: [
          [
            'Zaiflik, uni yengish kerak',
            'Слабость, её надо перебороть',
            'Weakness you must push through',
          ],
          [
            'Hech narsa, davom etish kerak',
            'Ничего, надо идти дальше',
            'Nothing, keep going',
          ],
          [
            'Guruhdan yashirish kerak',
            'Это надо скрыть от группы',
            'Something to hide from the group',
          ],
        ],
        explanation: [
          'Qoʻrquv — tabiiy ogohlantirish. Guruhga ayting. Qaytish yoki boshqa yoʻl tanlash — yaxshi qaror.',
          'Страх — естественное предупреждение. Скажите группе. Повернуть или выбрать другой путь — хорошее решение.',
          'Fear is a natural warning. Tell the group. Turning back or choosing another way is a good decision.',
        ],
        wrongExplanation: [
          'Qoʻrquvni yashirmang. U koʻpincha haqiqiy xavfni koʻrsatadi.',
          'Не скрывайте страх. Он часто указывает на реальную опасность.',
          'Do not hide fear. It often points to real danger.',
        ],
      },
    ],
  },
  {
    tierKey: '4',
    icon: 'bolt',
    title: ['Tizmalarda momaqaldiroq', 'Грозы на гребнях', 'Storms on ridges'],
    questions: [
      {
        prompt: [
          'Tizmada turganingizda momaqaldiroq yaqinlashyapti. Avval nima qilasiz?',
          'Вы на гребне, приближается гроза. Что делать сначала?',
          'You are on a ridge and a storm is coming. What do you do first?',
        ],
        hint: [
          'Eng baland nuqtadan uzoqroq.',
          'Подальше от самой высокой точки.',
          'Away from the highest point.',
        ],
        answer: [
          'Darhol tizmadan pastga tushish',
          'Сразу уйти с гребня вниз',
          'Get off the ridge and go down at once',
        ],
        wrong: [
          [
            'Choʻqqiga tezroq chiqish',
            'Быстрее подняться на вершину',
            'Rush to the summit',
          ],
          ['Tizmada kutish', 'Переждать на гребне', 'Wait on the ridge'],
          [
            'Metall tayoqlarni koʻtarib turish',
            'Поднять металлические палки вверх',
            'Hold metal poles up',
          ],
        ],
        explanation: [
          'Chaqmoq baland va ochiq joylarga uradi. Tizma va choʻqqidan imkon qadar tezroq pastga tushing.',
          'Молния бьёт в высокие открытые места. Уходите с гребня и вершины как можно быстрее.',
          'Lightning strikes high, exposed places. Leave the ridge and summit as fast as you can.',
        ],
        wrongExplanation: [
          'Tizmada qolish eng xavfli. Pastga harakat qiling.',
          'Оставаться на гребне — самое опасное. Двигайтесь вниз.',
          'Staying on the ridge is the most dangerous choice. Move down.',
        ],
      },
      {
        prompt: [
          'Momaqaldiroq paytida qayerda yashirinmaslik kerak?',
          'Где нельзя укрываться в грозу?',
          'Where should you NOT shelter in a thunderstorm?',
        ],
        answer: [
          'Yolgʻiz daraxt ostida',
          'Под одиноким деревом',
          'Under a lone tree',
        ],
        wrong: [
          [
            'Pastroq, past butalar orasida',
            'Ниже, среди низких кустов',
            'Lower down among low bushes',
          ],
          [
            'Tizmadan uzoqda, chuqurroq joyda',
            'Вдали от гребня, в понижении',
            'Away from the ridge in a dip',
          ],
          [
            'Qalin oʻrmon ichida, pastda',
            'Внизу, в густом лесу',
            'Low down in a dense forest',
          ],
        ],
        explanation: [
          'Yolgʻiz daraxt chaqmoqni oʻziga tortadi va tok yer orqali atrofga tarqaladi.',
          'Одинокое дерево притягивает молнию, а ток расходится по земле вокруг.',
          'A lone tree attracts lightning and the current spreads through the ground around it.',
        ],
        wrongExplanation: [
          'Yolgʻiz daraxt eng xavfli joylardan biri. Pastroq, bir xil balandlikdagi oʻsimliklar orasini tanlang.',
          'Одинокое дерево — одно из самых опасных мест. Ищите понижение или ровный лес.',
          'A lone tree is one of the worst places. Look for low ground or even forest.',
        ],
      },
      {
        prompt: [
          'Momaqaldiroq paytida guruh qanday turadi?',
          'Как группе держаться во время грозы?',
          'How should a group spread out in a lightning storm?',
        ],
        hint: [
          'Bitta zarba hammaga tegmasin.',
          'Чтобы один удар не задел всех.',
          'So one strike does not hit everyone.',
        ],
        answer: [
          'Bir-biridan kamida 15 metr uzoqlikda',
          'На расстоянии не меньше 15 метров друг от друга',
          'At least 15 metres apart',
        ],
        wrong: [
          [
            'Hammasi bir joyda yopishib',
            'Все вместе, тесно',
            'All huddled together',
          ],
          ['Qoʻl ushlashib', 'Взявшись за руки', 'Holding hands'],
          ['Bir qatorda tizmada', 'В ряд на гребне', 'In a line on the ridge'],
        ],
        explanation: [
          'Tarqalib tursangiz, chaqmoq urganda hamma jarohat olmaydi va sogʻ qolganlar yordam bera oladi.',
          'Если рассредоточиться, при ударе пострадают не все, и остальные смогут помочь.',
          'Spread out, and if lightning strikes, not everyone is hurt and the others can help.',
        ],
        wrongExplanation: [
          'Birga turgan guruhni bitta zarba jarohatlaydi. Tarqaling.',
          'Стоящих вместе может поразить один удар. Рассредоточьтесь.',
          'One strike can hurt a whole huddled group. Spread out.',
        ],
      },
      {
        prompt: [
          'Sochlar tikka boʻldi, havo shitirlayapti. Nima qilasiz?',
          'Волосы встали дыбом, воздух потрескивает. Что делать?',
          'Your hair stands up and the air buzzes. What do you do?',
        ],
        answer: [
          'Darhol u yerdan pastga ketish',
          'Немедленно уходить вниз',
          'Leave the spot and go down immediately',
        ],
        wrong: [
          ['Suratga olish', 'Сделать фото', 'Take a selfie'],
          ['Turgan joyda kutish', 'Стоять и ждать', 'Stand still and wait'],
          [
            'Eng baland toshga chiqish',
            'Залезть на самый высокий камень',
            'Climb the highest rock',
          ],
        ],
        explanation: [
          'Bu chaqmoq yaqin urishi mumkinligini bildiradi. Tezda pastroq joyga oʻting. Boshqa iloj boʻlmasa, izolyatsiya gilamchasida choʻkkalab oʻtiring, oyoqlarni birga qiling.',
          'Это знак, что молния может ударить рядом. Быстро уходите ниже. Если некуда — присядьте на коврик, ноги вместе.',
          'This means lightning may strike very close. Move lower fast. If you cannot, crouch on a sleeping pad with your feet together.',
        ],
        wrongExplanation: [
          'Bu jiddiy ogohlantirish. Kutmang va baland joyga chiqmang.',
          'Это серьёзное предупреждение. Не ждите и не поднимайтесь выше.',
          'This is a serious warning. Do not wait or go higher.',
        ],
      },
      {
        prompt: [
          'Momaqaldiroqdan qochishning eng yaxshi usuli qaysi?',
          'Как лучше всего избежать грозы в горах?',
          'What is the best way to avoid storms in the mountains?',
        ],
        hint: [
          'Hammasi soatga bogʻliq.',
          'Всё дело во времени.',
          'It is all about timing.',
        ],
        answer: [
          'Erta chiqib, tushgacha tizmadan tushish',
          'Выходить рано и уйти с гребня до обеда',
          'Start early and be off the ridge by midday',
        ],
        wrong: [
          [
            'Tushdan keyin chiqish',
            'Выходить после обеда',
            'Start after lunch',
          ],
          [
            'Faqat tunda chiqish',
            'Подниматься только ночью',
            'Only climb at night',
          ],
          [
            'Prognozni eʼtiborsiz qoldirish',
            'Не смотреть прогноз',
            'Ignore the forecast',
          ],
        ],
        explanation: [
          'Yozda momaqaldiroqlar koʻpincha tushdan keyin keladi. Erta chiqish xavfsiz tushish uchun vaqt beradi.',
          'Летние грозы обычно приходят после обеда. Ранний выход даёт время безопасно спуститься.',
          'Summer storms usually come in the afternoon. An early start gives you time to get down safely.',
        ],
        wrongExplanation: [
          'Kech chiqish sizni momaqaldiroq vaqtida tizmada qoldiradi.',
          'Поздний выход оставит вас на гребне в разгар грозы.',
          'A late start leaves you on the ridge when storms hit.',
        ],
      },
      {
        prompt: [
          'Momaqaldiroqda qoya ostidagi sayoz boÊ»shliq xavfsizmi?',
          'Безопасен ли неглубокий скальный навес в грозу?',
          'Is a shallow overhang in the rock safe in a lightning storm?',
        ],
        answer: [
          'Yoʻq, tok uning kirish qismidan oʻtishi mumkin',
          'Нет, ток может пройти через его вход',
          'No, current can jump across its opening',
        ],
        wrong: [
          [
            'Ha, bu eng xavfsiz joy',
            'Да, это самое безопасное место',
            'Yes, it is the safest place',
          ],
          ['Ha, agar quruq boʻlsa', 'Да, если там сухо', 'Yes, if it is dry'],
          [
            'Ha, agar metall narsalar bilan boʻlsangiz',
            'Да, если взять металлические вещи',
            'Yes, if you hold metal objects',
          ],
        ],
        explanation: [
          'Sayoz boʻshliq va gʻorning kirishi xavfli. Pastroq, ochiq boʻlmagan joyga oʻting.',
          'Неглубокие навесы и входы в пещеры опасны. Уходите ниже, в менее открытое место.',
          'Shallow overhangs and cave mouths are dangerous. Move lower to less exposed ground.',
        ],
        wrongExplanation: [
          'Bunday joyda tok sizdan oʻtishi mumkin. Pastga tushing.',
          'В таком месте ток может пройти через вас. Спускайтесь.',
          'Current can pass through you in such places. Go down.',
        ],
      },
      {
        prompt: [
          'Chaqmoq urgan odamga tegish xavfsizmi?',
          'Безопасно ли касаться человека, в которого ударила молния?',
          'Is it safe to touch someone struck by lightning?',
        ],
        hint: [
          'Odam tokni ushlab qolmaydi.',
          'Человек не держит заряд.',
          'A person does not hold a charge.',
        ],
        answer: [
          'Ha, darhol yordam berish va 112 ga qoʻngʻiroq qilish',
          'Да, сразу помогать и звонить 112',
          'Yes; help at once and call 112',
        ],
        wrong: [
          [
            'Yoʻq, u elektr toki bilan zaryadlangan',
            'Нет, он заряжен током',
            'No, they are still electrified',
          ],
          ['Faqat bir soatdan keyin', 'Только через час', 'Only after an hour'],
          [
            'Faqat rezina qoʻlqopda',
            'Только в резиновых перчатках',
            'Only with rubber gloves',
          ],
        ],
        explanation: [
          'Chaqmoq urgan odam tok saqlamaydi. Nafas va hushni tekshiring, nafas boʻlmasa, yurak-oʻpka reanimatsiyasini boshlang.',
          'Человек после удара молнии не хранит заряд. Проверьте дыхание и сознание; если нет дыхания — начинайте сердечно-лёгочную реанимацию.',
          'Lightning victims do not carry a charge. Check breathing and response; if they are not breathing, start CPR.',
        ],
        wrongExplanation: [
          'Kutish hayotga xavf soladi. Xavfsiz boʻlsa, darhol yordam bering.',
          'Ожидание стоит жизни. Если место безопасно — помогайте сразу.',
          'Waiting can cost a life. If the area is safe, help straight away.',
        ],
      },
      {
        prompt: [
          'Oxirgi momaqaldiroqdan keyin qancha kutish kerak?',
          'Сколько ждать после последнего раската грома?',
          'How long should you wait after the last thunder?',
        ],
        answer: [
          'Kamida 30 daqiqa',
          'Не меньше 30 минут',
          'At least 30 minutes',
        ],
        wrong: [
          ['1 daqiqa', '1 минуту', '1 minute'],
          ['Kutish shart emas', 'Ждать не нужно', 'No need to wait'],
          [
            'Yomgʻir toʻxtashi bilan',
            'Как только кончится дождь',
            'As soon as the rain stops',
          ],
        ],
        explanation: [
          'Chaqmoq yomgʻirdan keyin ham, bulut uzoqlashganda ham urishi mumkin. 30 daqiqa sukunatdan keyin harakatni davom ettiring.',
          'Молния может ударить и после дождя, когда туча уже уходит. Продолжайте путь через 30 минут тишины.',
          'Lightning can strike after the rain and as the cloud moves away. Carry on after 30 quiet minutes.',
        ],
        wrongExplanation: [
          'Yomgʻir toʻxtashi xavf tugaganini anglatmaydi.',
          'Конец дождя не значит конец опасности.',
          'The rain stopping does not mean the danger is over.',
        ],
      },
      {
        prompt: [
          'Momaqaldiroqda suv havzalari haqida nima toʻgʻri?',
          'Что верно про воду в грозу?',
          'What is true about water during a thunderstorm?',
        ],
        hint: [
          'Suv tokni yaxshi oʻtkazadi.',
          'Вода хорошо проводит ток.',
          'Water conducts electricity well.',
        ],
        answer: [
          'Koʻl va soylardan uzoqlashish',
          'Держаться подальше от озёр и ручьёв',
          'Move away from lakes and streams',
        ],
        wrong: [
          [
            'Koʻlda suzish xavfsiz',
            'Купаться в озере безопасно',
            'Swimming in a lake is safe',
          ],
          ['Soy boʻyida kutish', 'Переждать у ручья', 'Wait beside a stream'],
          ['Suvga kirib turish', 'Зайти в воду', 'Stand in the water'],
        ],
        explanation: [
          'Chaqmoq suvga ursa, tok uzoqqa tarqaladi. Fan togʻlaridagi koʻllarda momaqaldiroq paytida qirgʻoqdan uzoqlashing.',
          'При ударе в воду ток расходится далеко. У озёр Фанских гор в грозу отходите от берега.',
          'When lightning hits water, current spreads far. At the Fann lakes, move away from the shore in a storm.',
        ],
        wrongExplanation: [
          'Suv yonida qolish momaqaldiroqda xavfli.',
          'Оставаться у воды в грозу опасно.',
          'Staying near water in a storm is dangerous.',
        ],
      },
      {
        prompt: [
          'Momaqaldiroq yaqinlashganda metall jihozlar bilan nima qilish kerak?',
          'Что делать с металлическим снаряжением при приближении грозы?',
          'What should you do with metal gear as a storm approaches?',
        ],
        answer: [
          'Ulardan uzoqroq qoʻyib, tezda pastga tushish',
          'Отложить в сторону и быстро спускаться',
          'Set them aside and get down fast',
        ],
        wrong: [
          [
            'Tayoqlarni yuqoriga koʻtarish',
            'Поднять палки над головой',
            'Hold poles above your head',
          ],
          [
            'Metallni quchoqlab olish',
            'Обнять металлические вещи',
            'Hug the metal gear',
          ],
          [
            'Metall panjaraga suyanish',
            'Опереться на металлические перила',
            'Lean on metal railings',
          ],
        ],
        explanation: [
          'Asosiy narsa — baland va ochiq joydan tez tushish. Metallni boshdan yuqorida ushlamang va metall arqon va panjaralardan uzoqlashing.',
          'Главное — быстро уйти с высокого открытого места. Не держите металл над головой и отойдите от металлических тросов и перил.',
          'The key is to get off high, open ground fast. Do not hold metal overhead, and stay away from metal cables and railings.',
        ],
        wrongExplanation: [
          'Boshdan yuqoridagi metall xavfni oshiradi. Uni pastda qoldirib, tushing.',
          'Металл над головой повышает риск. Опустите его и спускайтесь.',
          'Metal above your head raises the risk. Lower it and descend.',
        ],
      },
    ],
  },
  // ───────────────────────── Tier first-aid ─────────────────────────
  {
    tierKey: 'first-aid',
    icon: 'first-aid',
    title: [
      'Qon ketishi va yaralar',
      'Кровотечения и раны',
      'Bleeding & wounds',
    ],
    questions: [
      {
        prompt: [
          'Kuchli qon ketishini toʻxtatishning birinchi qadami qaysi?',
          'Первый шаг при сильном кровотечении?',
          'What is the first step to stop heavy bleeding?',
        ],
        hint: [
          'Qoʻlingiz eng yaxshi vosita.',
          'Ваша рука — лучший инструмент.',
          'Your hand is the best tool.',
        ],
        answer: [
          'Toza mato bilan yaraga qattiq bosish',
          'Сильно прижать рану чистой тканью',
          'Press hard on the wound with a clean cloth',
        ],
        wrong: [
          [
            'Yarani suv bilan uzoq yuvish',
            'Долго промывать рану водой',
            'Rinse the wound for a long time',
          ],
          [
            'Darhol jgut bogʻlash',
            'Сразу наложить жгут',
            'Put on a tourniquet straight away',
          ],
          [
            'Yarani ochiq qoldirish',
            'Оставить рану открытой',
            'Leave the wound open',
          ],
        ],
        explanation: [
          'Toʻgʻridan-toʻgʻri bosim aksariyat qon ketishni toʻxtatadi. Bosimni kamida 10 daqiqa toʻxtatmang va 112 ga qoʻngʻiroq qiling.',
          'Прямое давление останавливает большинство кровотечений. Не ослабляйте его минимум 10 минут и звоните 112.',
          'Direct pressure stops most bleeding. Keep pressing for at least 10 minutes without letting go, and call 112.',
        ],
        wrongExplanation: [
          'Avval bosim. Jgut faqat bosim yordam bermagan hayot uchun xavfli qon ketishda kerak.',
          'Сначала давление. Жгут — только при угрожающем жизни кровотечении, когда давление не помогло.',
          'Pressure comes first. A tourniquet is only for life-threatening limb bleeding that pressure cannot stop.',
        ],
      },
      {
        prompt: [
          'Bint qonga toʻyindi. Nima qilasiz?',
          'Повязка пропиталась кровью. Что делать?',
          'The dressing soaks through with blood. What do you do?',
        ],
        answer: [
          'Ustidan yangi bint qoʻyib, bosishni davom ettirish',
          'Наложить новый слой сверху и продолжать давить',
          'Add another layer on top and keep pressing',
        ],
        wrong: [
          [
            'Eski bintni olib tashlash',
            'Снять старую повязку',
            'Remove the old dressing',
          ],
          [
            'Bosishni toʻxtatib, qarash',
            'Перестать давить и посмотреть',
            'Stop pressing to have a look',
          ],
          ['Yarani yuvish', 'Промыть рану', 'Wash the wound'],
        ],
        explanation: [
          'Eski bintni olib tashlasangiz, hosil boʻlgan qon laxtasi buziladi. Ustidan qoʻshing va qattiqroq bosing.',
          'Если снять старую повязку, сорвётся сгусток. Добавьте слой сверху и давите сильнее.',
          'Removing the old dressing tears away the clot. Add more on top and press harder.',
        ],
        wrongExplanation: [
          'Bintni olmang va bosimni toʻxtatmang.',
          'Не снимайте повязку и не прекращайте давление.',
          'Do not remove the dressing or ease off the pressure.',
        ],
      },
      {
        prompt: [
          'Kichik kesilgan yarani qanday tozalaysiz?',
          'Как очистить небольшой порез?',
          'How do you clean a small cut?',
        ],
        hint: [
          'Ichsa boʻladigan suv.',
          'Вода, которую можно пить.',
          'Water you could drink.',
        ],
        answer: [
          'Toza ichimlik suvi bilan yuvib, plastir yopishtirish',
          'Промыть чистой питьевой водой и заклеить пластырем',
          'Rinse with clean drinking water and cover it',
        ],
        wrong: [
          [
            'Soy suvi bilan, yuvmasdan',
            'Водой из ручья, не промывая толком',
            'With stream water, barely rinsed',
          ],
          ['Tuproq sepish', 'Присыпать землёй', 'Sprinkle soil on it'],
          [
            'Ochiq qoldirish, tez bitadi',
            'Оставить открытым, быстрее заживёт',
            'Leave it open so it heals faster',
          ],
        ],
        explanation: [
          'Kirni yaxshilab yuvib chiqaring va toza bint bilan yoping. Kunlar davomida infeksiya belgilarini kuzating.',
          'Хорошо вымойте грязь и закройте чистой повязкой. Следите за признаками инфекции в следующие дни.',
          'Wash out the dirt well and cover it with a clean dressing. Watch for signs of infection over the next days.',
        ],
        wrongExplanation: [
          'Iflos suv va tuproq infeksiya keltiradi. Toza suv va toza bint ishlating.',
          'Грязная вода и земля вызывают инфекцию. Только чистая вода и чистая повязка.',
          'Dirty water and soil cause infection. Use clean water and a clean dressing.',
        ],
      },
      {
        prompt: [
          'Yarada infeksiya belgisi qaysi?',
          'Какой признак инфекции раны?',
          'Which is a sign of wound infection?',
        ],
        answer: [
          'Kuchayib borayotgan qizarish, shish, issiqlik va yiring',
          'Нарастающие покраснение, отёк, жар и гной',
          'Spreading redness, swelling, heat and pus',
        ],
        wrong: [
          ['Qichishish va qobiq', 'Зуд и корочка', 'Itching and a scab'],
          [
            'Yara chetlarining yopilishi',
            'Края раны сходятся',
            'The edges closing up',
          ],
          ['Ogʻriqning kamayishi', 'Боль уменьшается', 'Pain getting less'],
        ],
        explanation: [
          'Bu belgilar yoki isitma paydo boʻlsa, shifokorga boring. Qizil chiziqlar tarqalsa, kutmang.',
          'При этих признаках или температуре обращайтесь к врачу. Если расходятся красные полосы — не ждите.',
          'If you see these signs or get a fever, see a doctor. If red streaks spread, do not wait.',
        ],
        wrongExplanation: [
          'Qobiq va qichishish odatda bitish belgisi. Kuchaygan qizarish va yiring esa — infeksiya.',
          'Корочка и зуд обычно означают заживление, а нарастающее покраснение и гной — инфекцию.',
          'A scab and itching usually mean healing; spreading redness and pus mean infection.',
        ],
      },
      {
        prompt: [
          'Yaraga shox yoki boshqa narsa sanchilib qoldi. Nima qilasiz?',
          'В ране застряла ветка или другой предмет. Что делать?',
          'A stick is stuck deep in a wound. What do you do?',
        ],
        hint: [
          'U qon ketishni toʻxtatib turgan boʻlishi mumkin.',
          'Он может сдерживать кровотечение.',
          'It may be holding back bleeding.',
        ],
        answer: [
          'Sugʻurmasdan, atrofini bint bilan mahkamlash va 112 ga qoʻngʻiroq qilish',
          'Не вытаскивать, обложить повязкой и звонить 112',
          'Leave it in, pad around it and call 112',
        ],
        wrong: [
          ['Tezda sugʻurib olish', 'Быстро вытащить', 'Pull it out quickly'],
          ['Ichkariroq itarish', 'Протолкнуть глубже', 'Push it further in'],
          [
            'Sindirib, qismini qoldirish',
            'Отломить и оставить часть',
            'Snap it and leave part in',
          ],
        ],
        explanation: [
          'Sanchilgan narsani sugʻurish kuchli qon ketishiga sabab boʻladi. Uni qimirlatmay, atrofidan bint qoʻyib, mahkamlang.',
          'Если вынуть предмет, может открыться сильное кровотечение. Зафиксируйте его, обложив повязкой.',
          'Removing it can cause heavy bleeding. Keep it still by padding around it with dressings.',
        ],
        wrongExplanation: [
          'Chuqur sanchilgan narsani faqat shifokor olib tashlaydi.',
          'Глубоко застрявший предмет удаляет только врач.',
          'Only a doctor should remove a deeply embedded object.',
        ],
      },
      {
        prompt: [
          'Qon yoʻqotgan odam oqarib, sovuq ter bosdi, yuragi tez urmoqda. Bu nima?',
          'Пострадавший бледный, в холодном поту, пульс частый. Что это?',
          'After blood loss someone is pale, clammy, with a fast pulse. What is it?',
        ],
        answer: [
          'Shok — yotqizish, issiq saqlash va 112 ga qoʻngʻiroq qilish',
          'Шок — уложить, согреть и звонить 112',
          'Shock — lay them down, keep warm and call 112',
        ],
        wrong: [
          [
            'Oddiy qoʻrquv, oʻtib ketadi',
            'Обычный испуг, пройдёт',
            'Just fright, it will pass',
          ],
          [
            'Ochlik — ovqat berish',
            'Голод — нужно покормить',
            'Hunger — give food',
          ],
          [
            'Charchoq — yurishni davom ettirish',
            'Усталость — идти дальше',
            'Tiredness — keep walking',
          ],
        ],
        explanation: [
          'Shok hayot uchun xavfli. Odamni yotqizing, yerdan izolyatsiya qiling va yopib qoʻying. Ovqat va ichimlik bermang.',
          'Шок опасен для жизни. Уложите человека, изолируйте от земли и укройте. Не давайте еды и питья.',
          'Shock is life-threatening. Lay the person down, insulate them from the ground and cover them. Do not give food or drink.',
        ],
        wrongExplanation: [
          'Bu belgilar shokni bildiradi. Tez yordam chaqiring.',
          'Эти признаки говорят о шоке. Вызывайте помощь.',
          'These signs point to shock. Call for help.',
        ],
      },
      {
        prompt: [
          'Birovning yarasiga yordam berishdan oldin oʻzingizni qanday himoya qilasiz?',
          'Как защитить себя, помогая при кровотечении?',
          'How do you protect yourself when helping with bleeding?',
        ],
        hint: ['Aptechkada bor.', 'Это есть в аптечке.', 'It is in the kit.'],
        answer: [
          'Bir martalik qoʻlqop kiyish',
          'Надеть одноразовые перчатки',
          'Put on disposable gloves',
        ],
        wrong: [
          [
            'Yalang qoʻl bilan, tezroq',
            'Голыми руками, так быстрее',
            'Bare hands, it is faster',
          ],
          ['Yordam bermaslik', 'Не помогать', 'Do not help'],
          [
            'Qoʻlni tuproq bilan ishqalash',
            'Натереть руки землёй',
            'Rub soil on your hands',
          ],
        ],
        explanation: [
          'Qoʻlqop sizni va jarohatlangan odamni infeksiyadan himoya qiladi. Qoʻlqop boʻlmasa, toza paketdan foydalaning.',
          'Перчатки защищают вас и пострадавшего от инфекции. Нет перчаток — используйте чистый пакет.',
          'Gloves protect you and the injured person from infection. No gloves? Use a clean plastic bag.',
        ],
        wrongExplanation: [
          'Qoʻlqop aptechkada boʻlishi kerak. U ikkalangizni himoya qiladi.',
          'Перчатки должны быть в аптечке. Они защищают вас обоих.',
          'Gloves belong in every kit. They protect you both.',
        ],
      },
      {
        prompt: [
          'Jgut haqida qaysi gap toʻgʻri?',
          'Что верно про жгут?',
          'Which is true about a tourniquet?',
        ],
        answer: [
          'Faqat bosim yordam bermagan hayot uchun xavfli qon ketishida, vaqtni yozib',
          'Только при угрожающем жизни кровотечении из конечности, когда давление не помогло; записать время',
          'Only for life-threatening limb bleeding pressure cannot stop; note the time',
        ],
        wrong: [
          ['Har qanday kesilganda', 'При любом порезе', 'For any cut'],
          [
            'Bosh jarohatida boʻyinga',
            'На шею при ранении головы',
            'Around the neck for head wounds',
          ],
          [
            'Har 5 daqiqada yechib turish',
            'Снимать каждые 5 минут',
            'Loosen it every 5 minutes',
          ],
        ],
        explanation: [
          'Jgutni yaradan yuqoriroqqa, qon toʻxtaguncha qattiq torting va qoʻyilgan vaqtni yozing. Uni faqat shifokorlar yechadi.',
          'Жгут накладывают выше раны и затягивают, пока кровь не остановится; время записывают. Снимают его только медики.',
          'Put it above the wound and tighten until the bleeding stops, then note the time. Only medics should remove it.',
        ],
        wrongExplanation: [
          'Jgut — oxirgi chora. Avval toʻgʻridan-toʻgʻri bosim.',
          'Жгут — крайняя мера. Сначала прямое давление.',
          'A tourniquet is a last resort. Direct pressure comes first.',
        ],
      },
      {
        prompt: [
          'Tizzangiz tirnaldi va qumli boʻldi. Eng yaxshi harakat qaysi?',
          'Ссадина на колене с песком. Как лучше поступить?',
          'You scrape your knee and it is full of grit. What is best?',
        ],
        hint: [
          'Kir ichkarida qolmasin.',
          'Грязь не должна остаться внутри.',
          'The dirt should not stay in.',
        ],
        answer: [
          'Toza suv bilan yaxshilab yuvib, yopish',
          'Тщательно промыть чистой водой и закрыть',
          'Rinse well with clean water, then cover',
        ],
        wrong: [
          [
            'Qumni qoldirib, bint bogʻlash',
            'Забинтовать вместе с песком',
            'Bandage over the grit',
          ],
          [
            'Spirt bilan quyib, ochiq qoldirish',
            'Залить спиртом и оставить открытым',
            'Pour alcohol on it and leave it open',
          ],
          ['Hech narsa qilmaslik', 'Ничего не делать', 'Do nothing'],
        ],
        explanation: [
          'Qolgan qum infeksiya chaqiradi. Koʻp suv bilan yuvib, toza bint yoki plastir bilan yoping.',
          'Оставшийся песок вызывает инфекцию. Промойте большим количеством воды и закройте чистой повязкой.',
          'Grit left in causes infection. Flush with plenty of water and cover with a clean dressing.',
        ],
        wrongExplanation: [
          'Kirni yuvib tashlash — eng muhimi. Keyin yoping.',
          'Главное — вымыть грязь. Потом закрыть.',
          'Washing out the dirt matters most. Then cover it.',
        ],
      },
      {
        prompt: [
          'Yarani qachon shifokorga koʻrsatish kerak?',
          'Когда рану нужно показать врачу?',
          'When should a wound be seen by a doctor?',
        ],
        answer: [
          'Chuqur, chetlari ochilgan yoki hayvon tishlagan boʻlsa',
          'Если она глубокая, края расходятся или это укус животного',
          'If it is deep, gaping or an animal bite',
        ],
        wrong: [
          [
            'Hech qachon, oʻzi bitadi',
            'Никогда, само заживёт',
            'Never, it heals by itself',
          ],
          ['Faqat bir oydan keyin', 'Только через месяц', 'Only after a month'],
          [
            'Faqat ogʻrimasa',
            'Только если не болит',
            'Only if it does not hurt',
          ],
        ],
        explanation: [
          'Chuqur yaralarga tikish kerak boʻlishi mumkin. Hayvon tishlashi quturish xavfi tufayli darhol shifokorni talab qiladi.',
          'Глубоким ранам могут понадобиться швы. Укус животного требует врача сразу из-за риска бешенства.',
          'Deep wounds may need stitches. Any animal bite needs a doctor quickly because of the rabies risk.',
        ],
        wrongExplanation: [
          'Baʼzi yaralar oʻzi bitmaydi. Shubha boʻlsa, shifokorga koʻrsating.',
          'Некоторые раны сами не заживут. Сомневаетесь — покажите врачу.',
          'Some wounds will not heal on their own. If in doubt, see a doctor.',
        ],
      },
    ],
  },
  {
    tierKey: 'first-aid',
    icon: 'first-aid',
    title: [
      'Choʻzilish va sinish',
      'Растяжения и переломы',
      'Sprains & fractures',
    ],
    questions: [
      {
        prompt: [
          'Toshda oyoq burildi va shishyapti. Avval nima qilasiz?',
          'Подвернули ногу на камне, она отекает. Что сначала?',
          'You twist your ankle on a rock and it swells. What first?',
        ],
        hint: [
          'Dam, sovuq, bogʻlash, koʻtarish.',
          'Покой, холод, повязка, возвышение.',
          'Rest, cold, wrap, raise.',
        ],
        answer: [
          'Dam berish, sovuq qoʻyish, bogʻlash va oyoqni koʻtarish',
          'Покой, холод, тугая повязка и приподнять ногу',
          'Rest, cold, compression and raise the leg',
        ],
        wrong: [
          [
            'Yurishni davom ettirib, «yoyish»',
            'Продолжать идти, чтобы «расходить»',
            'Keep walking to "walk it off"',
          ],
          [
            'Issiq kompress qoʻyish',
            'Приложить горячий компресс',
            'Put on a hot compress',
          ],
          ['Qattiq massaj qilish', 'Сильно массировать', 'Massage it hard'],
        ],
        explanation: [
          'Sovuq narsani matoga oʻrab, 15–20 daqiqa qoʻying. Oyoqqa tayanib boʻlmasa, sinish boʻlishi mumkin — yordam soʻrang.',
          'Холод заверните в ткань и прикладывайте на 15–20 минут. Если наступить невозможно, возможен перелом — зовите помощь.',
          'Wrap something cold in cloth and apply for 15–20 minutes. If you cannot stand on it, it may be broken — get help.',
        ],
        wrongExplanation: [
          'Yurish, issiqlik va massaj shishni kuchaytiradi.',
          'Ходьба, тепло и массаж усиливают отёк.',
          'Walking, heat and massage make the swelling worse.',
        ],
      },
      {
        prompt: [
          'Muzni teriga qanday qoʻyish kerak?',
          'Как правильно прикладывать лёд?',
          'How should you put ice on the skin?',
        ],
        answer: [
          'Matoga oʻrab, 15–20 daqiqa',
          'Завернув в ткань, на 15–20 минут',
          'Wrapped in cloth, for 15–20 minutes',
        ],
        wrong: [
          [
            'Toʻgʻridan-toʻgʻri, bir necha soat',
            'Прямо на кожу, на несколько часов',
            'Directly on the skin for hours',
          ],
          ['Faqat 10 soniya', 'Всего на 10 секунд', 'For only 10 seconds'],
          ['Muz kerak emas', 'Лёд не нужен', 'Ice is never needed'],
        ],
        explanation: [
          'Toʻgʻridan-toʻgʻri muz terini sovuq urishi mumkin. Tanaffus qilib, takrorlang. Qor yoki sovuq soy suvi ham yaraydi.',
          'Лёд прямо на коже может вызвать обморожение. Делайте перерывы и повторяйте. Подойдёт и снег или холодная вода из ручья.',
          'Ice straight on skin can cause frostbite. Take breaks and repeat. Snow or cold stream water also works.',
        ],
        wrongExplanation: [
          'Muzni doim mato orqali va qisqa vaqt qoʻying.',
          'Лёд — всегда через ткань и ненадолго.',
          'Always use ice through cloth and for short periods.',
        ],
      },
      {
        prompt: [
          'Qoʻl suyagi singanga oʻxshaydi. Nima qilasiz?',
          'Похоже на перелом руки. Что делать?',
          'It looks like a broken arm. What do you do?',
        ],
        hint: ['Harakatsiz qilish.', 'Обездвижить.', 'Keep it still.'],
        answer: [
          'Topilgan holatida shina bilan mahkamlash',
          'Зафиксировать шиной в том положении, в каком нашли',
          'Splint it in the position you find it',
        ],
        wrong: [
          [
            'Toʻgʻrilashga urinish',
            'Попытаться выпрямить',
            'Try to straighten it',
          ],
          [
            'Qimirlatib tekshirish',
            'Подвигать, чтобы проверить',
            'Move it to test',
          ],
          [
            'Hech narsa qilmay, yurish',
            'Ничего не делать и идти',
            'Ignore it and walk on',
          ],
        ],
        explanation: [
          'Shina sinish joyidan yuqori va pastdagi boʻgʻinlarni ushlab tursin. Barmoqlarda qon aylanishi va sezgini tekshiring.',
          'Шина должна фиксировать суставы выше и ниже перелома. Проверьте кровообращение и чувствительность в пальцах.',
          'The splint should hold the joints above and below the break. Check circulation and feeling in the fingers.',
        ],
        wrongExplanation: [
          'Toʻgʻrilash qon tomir va nervlarga zarar yetkazishi mumkin. Faqat mahkamlang.',
          'Выпрямление может повредить сосуды и нервы. Только фиксируйте.',
          'Straightening can damage blood vessels and nerves. Only immobilise.',
        ],
      },
      {
        prompt: [
          'Togʻda shinani nimadan yasash mumkin?',
          'Из чего сделать шину в горах?',
          'What can you make a splint from in the mountains?',
        ],
        answer: [
          'Trekking tayogʻi, gilamcha yoki qalin karton',
          'Треккинговая палка, коврик или плотный картон',
          'A trekking pole, sleeping pad or stiff cardboard',
        ],
        wrong: [
          [
            'Faqat maxsus tibbiy shina',
            'Только специальная медицинская шина',
            'Only a medical splint',
          ],
          ['Yumshoq sharf, yolgʻiz', 'Один мягкий шарф', 'A soft scarf alone'],
          ['Shina kerak emas', 'Шина не нужна', 'No splint is needed'],
        ],
        explanation: [
          'Qattiq narsani yumshoq kiyim bilan oʻrab, bogʻich bilan mahkamlang. Juda qattiq bogʻlamang.',
          'Обмотайте жёсткий предмет мягкой одеждой и закрепите. Не затягивайте слишком туго.',
          'Pad something stiff with soft clothing and tie it on. Do not tie it too tight.',
        ],
        wrongExplanation: [
          'Yumshoq mato yolgʻiz suyakni ushlab turmaydi. Qattiq narsa kerak.',
          'Одна мягкая ткань не удержит кость. Нужно что-то жёсткое.',
          'Soft cloth alone will not hold a bone still. Use something stiff.',
        ],
      },
      {
        prompt: [
          'Shina qoʻyilgandan keyin barmoqlar koʻkarib, sovuq boʻldi. Nima qilasiz?',
          'После наложения шины пальцы посинели и похолодели. Что делать?',
          'After splinting, the fingers turn blue and cold. What do you do?',
        ],
        hint: [
          'Qon aylanmayapti.',
          'Кровь не проходит.',
          'Blood is not getting through.',
        ],
        answer: ['Bogʻichni boʻshatish', 'Ослабить повязку', 'Loosen the ties'],
        wrong: [
          [
            'Yana qattiqroq bogʻlash',
            'Затянуть ещё сильнее',
            'Tighten it more',
          ],
          ['Eʼtibor bermaslik', 'Не обращать внимания', 'Ignore it'],
          [
            'Barmoqlarni issiq suvga solish',
            'Опустить пальцы в горячую воду',
            'Put the fingers in hot water',
          ],
        ],
        explanation: [
          'Koʻkarish va sovuqlik qon aylanishi toʻxtaganini bildiradi. Bogʻichni boʻshatib, har 15 daqiqada tekshiring.',
          'Синюшность и холод значат, что нарушено кровообращение. Ослабьте и проверяйте каждые 15 минут.',
          'Blue, cold fingers mean blood flow is cut off. Loosen the ties and check every 15 minutes.',
        ],
        wrongExplanation: [
          'Qattiq bogʻich aʼzoga zarar yetkazadi. Boʻshating.',
          'Слишком тугая повязка вредит конечности. Ослабьте.',
          'A tie that is too tight harms the limb. Loosen it.',
        ],
      },
      {
        prompt: [
          'Odam yiqilib, boʻyni yoki beli ogʻriyapti. Nima qilasiz?',
          'Человек упал, болит шея или спина. Что делать?',
          'Someone falls and has neck or back pain. What do you do?',
        ],
        answer: [
          'Xavf boʻlmasa, qimirlatmaslik va 112 ga qoʻngʻiroq qilish',
          'Если нет угрозы — не двигать и звонить 112',
          'Do not move them unless in danger; call 112',
        ],
        wrong: [
          ['Darhol oʻtirgʻizish', 'Сразу посадить', 'Sit them up at once'],
          [
            'Yurib koʻrishni soʻrash',
            'Попросить пройтись',
            'Ask them to try walking',
          ],
          [
            'Koʻtarib, pastga olib tushish',
            'Поднять и нести вниз',
            'Carry them down',
          ],
        ],
        explanation: [
          'Umurtqa jarohatida harakat falajga olib kelishi mumkin. Boshni qoʻllar bilan ushlab, iliq yoping va qutqaruvchilarni kuting.',
          'При травме позвоночника движение может привести к параличу. Придерживайте голову руками, укройте и ждите спасателей.',
          'With a spine injury, movement can cause paralysis. Hold the head still with your hands, keep them warm and wait for rescuers.',
        ],
        wrongExplanation: [
          'Umurtqa jarohatida harakat juda xavfli. Faqat yonida tosh qulashi yoki boshqa xavf boʻlsa, ehtiyotkorlik bilan siljiting.',
          'При травме позвоночника движение очень опасно. Перемещайте осторожно, только если рядом камнепад или другая угроза.',
          'Movement is very dangerous with a spine injury. Move them carefully only if there is rockfall or other danger.',
        ],
      },
      {
        prompt: [
          'Ochiq sinishda, suyak koʻrinib tursa, nima qilasiz?',
          'Открытый перелом, видна кость. Что делать?',
          'In an open fracture the bone is showing. What do you do?',
        ],
        hint: ['Ichkariga itarmang.', 'Не вправлять.', 'Do not push it back.'],
        answer: [
          'Toza bint bilan yopib, harakatsiz qilish va 112 ga qoʻngʻiroq qilish',
          'Закрыть чистой повязкой, обездвижить и звонить 112',
          'Cover with a clean dressing, immobilise and call 112',
        ],
        wrong: [
          [
            'Suyakni ichkariga itarish',
            'Вправить кость внутрь',
            'Push the bone back in',
          ],
          [
            'Ochiq qoldirib yuvish',
            'Оставить открытым и мыть',
            'Leave it open and keep washing',
          ],
          ['Odamni yurishga majburlash', 'Заставить идти', 'Make them walk'],
        ],
        explanation: [
          'Qon ketsa, suyak atrofidan bosing, suyakning oʻzini bosmang. Infeksiya xavfi yuqori, tez tibbiy yordam kerak.',
          'При кровотечении давите вокруг кости, а не на неё. Высокий риск инфекции — нужна быстрая медпомощь.',
          'If it bleeds, press around the bone, not on it. Infection risk is high, so medical help is needed quickly.',
        ],
        wrongExplanation: [
          'Suyakni itarish infeksiya va jarohatni kuchaytiradi.',
          'Вправление занесёт инфекцию и усилит травму.',
          'Pushing the bone back adds infection and damage.',
        ],
      },
      {
        prompt: [
          'Oyogʻingizga umuman tayana olmayapsiz. Qanday qaror qilasiz?',
          'Не можете наступить на ногу. Какое решение?',
          'You cannot put any weight on your leg. What is the decision?',
        ],
        answer: [
          'Yordam chaqirish, oʻzi tushishga urinmaslik',
          'Вызвать помощь, а не пытаться спускаться самому',
          'Call for help rather than trying to walk out',
        ],
        wrong: [
          [
            'Ogʻriqqa chidab tushish',
            'Терпеть и спускаться',
            'Grit your teeth and walk down',
          ],
          [
            'Yolgʻiz qolib, ertalabgacha kutish',
            'Остаться одному до утра',
            'Stay alone until morning',
          ],
          [
            'Hamma ketib, yordam olib kelsin',
            'Пусть все уйдут за помощью',
            'Everyone leaves to fetch help',
          ],
        ],
        explanation: [
          'Tayanib boʻlmasa, sinish boʻlishi mumkin. Yurish jarohatni yomonlashtiradi. Kimdir jarohatlangan bilan qolsin.',
          'Если нельзя наступить, возможен перелом, и ходьба его ухудшит. Кто-то должен остаться с пострадавшим.',
          'If you cannot bear weight it may be broken, and walking makes it worse. Someone stays with the injured person.',
        ],
        wrongExplanation: [
          'Jarohatlangan odamni yolgʻiz qoldirmang va majburlab yurgizmang.',
          'Не оставляйте пострадавшего одного и не заставляйте идти.',
          'Never leave the injured person alone or force them to walk.',
        ],
      },
      {
        prompt: [
          'Choʻzilishdan keyingi kunlarda nima yordam beradi?',
          'Что помогает в дни после растяжения?',
          'What helps in the days after a sprain?',
        ],
        hint: [
          'Shishni pastga tushiring.',
          'Уменьшите отёк.',
          'Bring down the swelling.',
        ],
        answer: [
          'Dam, oyoqni koʻtarib turish va asta-sekin yuklama',
          'Покой, возвышенное положение и постепенная нагрузка',
          'Rest, keeping it raised and slowly adding load',
        ],
        wrong: [
          [
            'Darhol yugurishni boshlash',
            'Сразу начать бегать',
            'Start running straight away',
          ],
          [
            'Issiq vanna birinchi kuni',
            'Горячая ванна в первый день',
            'A hot bath on the first day',
          ],
          [
            'Uzoq yurish bilan sinash',
            'Проверить длинным походом',
            'Test it with a long hike',
          ],
        ],
        explanation: [
          'Ogʻriq va shish kamaygach, yuklamani asta oshiring. Ogʻriq kuchli boʻlsa yoki oʻtmasa, shifokorga koʻrsating.',
          'Когда боль и отёк спадут, увеличивайте нагрузку понемногу. Если боль сильная или не проходит — к врачу.',
          'Once pain and swelling ease, add load gradually. If pain is strong or does not go away, see a doctor.',
        ],
        wrongExplanation: [
          'Erta yuklama jarohatni qaytaradi. Sabr qiling.',
          'Ранняя нагрузка возвращает травму. Наберитесь терпения.',
          'Loading it too early brings the injury back. Be patient.',
        ],
      },
      {
        prompt: [
          'Oyoq burilishining oldini olishda nima yordam beradi?',
          'Что помогает не подвернуть ногу?',
          'What helps prevent a twisted ankle?',
        ],
        answer: [
          'Yaxshi poyabzal, tayoqlar va oyoq ostiga qarab yurish',
          'Хорошая обувь, палки и внимание под ноги',
          'Good boots, poles and watching your footing',
        ],
        wrong: [
          ['Tushishda yugurish', 'Бегом на спуске', 'Running on descents'],
          ['Shippak kiyish', 'Ходить в шлёпанцах', 'Wearing flip-flops'],
          [
            'Telefonga qarab yurish',
            'Идти, глядя в телефон',
            'Walking while looking at your phone',
          ],
        ],
        explanation: [
          'Ayniqsa charchaganda va pastga tushishda ehtiyot boʻling — jarohatlarning koʻpi aynan shunda boʻladi.',
          'Будьте особенно внимательны на спуске и когда устали — тогда случается больше всего травм.',
          'Take extra care on descents and when tired; that is when most injuries happen.',
        ],
        wrongExplanation: [
          'Shoshilish va chalgʻish yiqilishga olib keladi. Sekin va diqqat bilan yuring.',
          'Спешка и отвлечение ведут к падениям. Идите медленно и внимательно.',
          'Rushing and distraction lead to falls. Walk slowly and carefully.',
        ],
      },
    ],
  },
  {
    tierKey: 'first-aid',
    icon: 'first-aid',
    title: [
      'Sovuq qotish va issiq urishi',
      'Переохлаждение и перегрев',
      'Hypothermia & heat',
    ],
    questions: [
      {
        prompt: [
          'Sovuq qotishning erta belgisi qaysi?',
          'Ранний признак переохлаждения?',
          'What is an early sign of hypothermia?',
        ],
        hint: [
          'Tana issiqlik ishlab chiqarishga urinadi.',
          'Тело пытается выработать тепло.',
          'The body is trying to make heat.',
        ],
        answer: [
          'Kuchli titrash va qoʻllarning qaltirashi',
          'Сильная дрожь и неловкость рук',
          'Strong shivering and clumsy hands',
        ],
        wrong: [
          ['Terlash', 'Потливость', 'Sweating'],
          [
            'Yuzning qizarishi va issiqlik',
            'Покраснение лица и жар',
            'A red, hot face',
          ],
          ['Ishtahaning oshishi', 'Повышенный аппетит', 'A bigger appetite'],
        ],
        explanation: [
          'Titrash, gandiraklash, duduqlanish va chalkashlik sovuq qotish belgisi. Bu yozda ham, yomgʻir va shamolda boʻlishi mumkin.',
          'Дрожь, спотыкание, невнятная речь и спутанность — признаки переохлаждения. Это бывает и летом под дождём и ветром.',
          'Shivering, stumbling, slurred speech and confusion are signs of hypothermia. It can happen in summer too, in rain and wind.',
        ],
        wrongExplanation: [
          'Sovuq qotish titrashdan boshlanadi. Belgilarni erta payqang.',
          'Переохлаждение начинается с дрожи. Замечайте признаки рано.',
          'Hypothermia starts with shivering. Spot the signs early.',
        ],
      },
      {
        prompt: [
          'Sovuq qotgan odamga qanday yordam berasiz?',
          'Как помочь переохлаждённому человеку?',
          'How do you help someone who is too cold?',
        ],
        answer: [
          'Panaga olish, hoʻl kiyimni quruqqa almashtirish, yerdan izolyatsiya',
          'Укрыть от ветра, сменить мокрую одежду на сухую, изолировать от земли',
          'Get them sheltered, swap wet clothes for dry and insulate from the ground',
        ],
        wrong: [
          ['Spirtli ichimlik berish', 'Дать алкоголь', 'Give them alcohol'],
          [
            'Qoʻl-oyogʻini qattiq ishqalash',
            'Сильно растирать руки и ноги',
            'Rub their arms and legs hard',
          ],
          ['Tez yugurishga majburlash', 'Заставить бегать', 'Make them run'],
        ],
        explanation: [
          'Hushi joyida boʻlsa, iliq shirin ichimlik bering. Ogʻir holatda ehtiyotkorlik bilan muomala qiling va 112 ga qoʻngʻiroq qiling.',
          'Если человек в сознании, дайте тёплое сладкое питьё. В тяжёлом состоянии обращайтесь бережно и звоните 112.',
          'If they are alert, give a warm sweet drink. If it is severe, handle them gently and call 112.',
        ],
        wrongExplanation: [
          'Spirtli ichimlik issiqlik yoʻqotilishini tezlashtiradi, ishqalash esa zarar beradi.',
          'Алкоголь ускоряет потерю тепла, а растирание вредит.',
          'Alcohol speeds up heat loss and hard rubbing causes harm.',
        ],
      },
      {
        prompt: [
          'Sovuq qotgan odam titrashni toʻxtatdi va uyquchan. Bu nima bildiradi?',
          'Переохлаждённый перестал дрожать и стал сонным. Что это значит?',
          'A cold person stops shivering and gets sleepy. What does it mean?',
        ],
        hint: [
          'Bu yaxshilanish emas.',
          'Это не улучшение.',
          'This is not getting better.',
        ],
        answer: [
          'Holat ogʻirlashdi — shoshilinch yordam kerak',
          'Состояние ухудшилось — нужна срочная помощь',
          'It has become severe — urgent help is needed',
        ],
        wrong: [
          ['U isindi', 'Он согрелся', 'They have warmed up'],
          [
            'Uxlashiga ruxsat berish kerak',
            'Дать ему поспать',
            'Let them sleep it off',
          ],
          [
            'Yurishni davom ettirish mumkin',
            'Можно идти дальше',
            'Fine to keep walking',
          ],
        ],
        explanation: [
          'Titrash toʻxtasa, tana issiqlik ishlab chiqarolmay qoladi. Ehtiyotkorlik bilan isiting, gorizontal holatda saqlang va 112 ga qoʻngʻiroq qiling.',
          'Если дрожь прекратилась, тело больше не может вырабатывать тепло. Бережно согревайте, держите горизонтально и звоните 112.',
          'When shivering stops, the body can no longer make heat. Rewarm gently, keep them lying flat and call 112.',
        ],
        wrongExplanation: [
          'Titrashning toʻxtashi — xavfli belgi, yaxshilanish emas.',
          'Прекращение дрожи — опасный признак, а не улучшение.',
          'Stopping shivering is a danger sign, not recovery.',
        ],
      },
      {
        prompt: [
          'Yozda Oʻzbekistonda sayohat uchun eng yaxshi vaqt qaysi?',
          'Когда летом в Узбекистане лучше выходить в поход?',
          'When is the best time to hike in an Uzbek summer?',
        ],
        answer: [
          'Erta tongda, kunning issiq vaqtidan oldin',
          'Рано утром, до самой жары',
          'Early morning, before the heat of the day',
        ],
        wrong: [
          ['Tush payti', 'В полдень', 'At noon'],
          ['Soat 14 da', 'В 14 часов', 'At 2 pm'],
          ['Farqi yoʻq', 'Неважно', 'It makes no difference'],
        ],
        explanation: [
          'Yozda tushdan keyin harorat 40°C dan oshishi mumkin. Erta chiqing, kunning issiq qismida soyada dam oling.',
          'Летом днём бывает выше +40°C. Выходите рано, а в жаркие часы отдыхайте в тени.',
          'In summer afternoons can pass 40°C. Start early and rest in the shade during the hottest hours.',
        ],
        wrongExplanation: [
          'Tush va tushdan keyin issiqlik eng xavfli. Ertalab chiqing.',
          'Полдень и после обеда — самое опасное время. Выходите утром.',
          'Midday and early afternoon heat is the most dangerous. Go in the morning.',
        ],
      },
      {
        prompt: [
          'Issiqdan holsizlanish belgilari qaysi?',
          'Каковы признаки теплового истощения?',
          'What are signs of heat exhaustion?',
        ],
        hint: [
          'Tana suv va tuz yoʻqotmoqda.',
          'Тело теряет воду и соль.',
          'The body is losing water and salt.',
        ],
        answer: [
          'Koʻp terlash, holsizlik, bosh aylanishi, koʻngil aynishi',
          'Сильный пот, слабость, головокружение, тошнота',
          'Heavy sweating, weakness, dizziness, nausea',
        ],
        wrong: [
          ['Titrash va sovuq qotish', 'Дрожь и озноб', 'Shivering and chills'],
          ['Ishtahaning oshishi', 'Повышенный аппетит', 'A bigger appetite'],
          ['Kuch-quvvat koʻpayishi', 'Прилив сил', 'A burst of energy'],
        ],
        explanation: [
          'Odamni soyaga olib, kiyimini boʻshating, salqin suv sepib, tuzli ichimlik bering. Yaxshilanmasa, yordam chaqiring.',
          'Уведите в тень, ослабьте одежду, охлаждайте водой и дайте подсоленное питьё. Если не легчает — вызывайте помощь.',
          'Move them into shade, loosen clothing, cool them with water and give a drink with some salt. If they do not improve, call for help.',
        ],
        wrongExplanation: [
          'Bu issiqlik belgilari. Darhol soyaga va salqinga.',
          'Это признаки перегрева. Сразу в тень и охлаждать.',
          'These are heat signs. Get into shade and cool down now.',
        ],
      },
      {
        prompt: [
          'Issiqda odam chalkashib gapiryapti, terisi issiq. Bu nima?',
          'В жару человек путается в словах, кожа горячая. Что это?',
          'In the heat someone is confused and their skin is hot. What is it?',
        ],
        answer: [
          'Issiq urishi — 112 ga qoʻngʻiroq qilib, darhol sovutish',
          'Тепловой удар — звонить 112 и срочно охлаждать',
          'Heatstroke — call 112 and cool them immediately',
        ],
        wrong: [
          ['Oddiy charchoq', 'Обычная усталость', 'Normal tiredness'],
          ['Choy berib kutish', 'Дать чаю и ждать', 'Give tea and wait'],
          ['Issiq kiyim kiydirish', 'Укутать потеплее', 'Wrap them up warmly'],
        ],
        explanation: [
          'Issiq urishi hayot uchun xavfli. Soyaga oling, kiyimni yeching, suv sepib, shamollating; boʻyin va qoʻltiqqa sovuq narsa qoʻying.',
          'Тепловой удар опасен для жизни. В тень, снять лишнюю одежду, поливать водой и обмахивать, холод на шею и подмышки.',
          'Heatstroke is life-threatening. Get them in shade, remove extra clothing, wet and fan them, and put cold packs on the neck and armpits.',
        ],
        wrongExplanation: [
          'Chalkashlik — jiddiy belgi. Kutmang, sovuting va yordam chaqiring.',
          'Спутанность — серьёзный признак. Не ждите: охлаждайте и вызывайте помощь.',
          'Confusion is a serious sign. Do not wait: cool them and call for help.',
        ],
      },
      {
        prompt: [
          'Issiq kunda qanday kiyinish kerak?',
          'Как одеваться в жаркий день?',
          'How should you dress on a hot day?',
        ],
        hint: [
          'Quyoshni toʻsish, havoni oʻtkazish.',
          'Закрыться от солнца, но пропускать воздух.',
          'Block the sun, let air through.',
        ],
        answer: [
          'Yengil, ochiq rangli, keng kiyim va bosh kiyim',
          'Лёгкая светлая свободная одежда и головной убор',
          'Light, loose, pale clothes and a hat',
        ],
        wrong: [
          ['Qora, qalin kiyim', 'Тёмная плотная одежда', 'Dark, thick clothes'],
          [
            'Bosh kiyimsiz, koʻylaksiz',
            'Без головного убора и футболки',
            'No hat and no shirt',
          ],
          [
            'Plyonkali yomgʻirpoʻsh',
            'Плёночный дождевик',
            'A plastic rain jacket',
          ],
        ],
        explanation: [
          'Ochiq rang quyoshni qaytaradi, keng kiyim havoni oʻtkazadi. Bosh kiyim issiq urishi xavfini kamaytiradi.',
          'Светлое отражает солнце, свободный крой пропускает воздух. Головной убор снижает риск теплового удара.',
          'Pale colours reflect the sun and loose clothes let air move. A hat lowers the risk of heatstroke.',
        ],
        wrongExplanation: [
          'Qora va qalin kiyim issiqlikni ushlab qoladi.',
          'Тёмная плотная одежда удерживает жар.',
          'Dark, thick clothes trap heat.',
        ],
      },
      {
        prompt: [
          'Togʻda yozda ham sovuq qotish mumkinmi?',
          'Можно ли переохладиться в горах летом?',
          'Can you get hypothermia in the mountains in summer?',
        ],
        answer: [
          'Ha, hoʻl kiyim, shamol va balandlik bilan',
          'Да, в мокрой одежде, на ветру и на высоте',
          'Yes, with wet clothes, wind and altitude',
        ],
        wrong: [
          ['Yoʻq, faqat qishda', 'Нет, только зимой', 'No, only in winter'],
          [
            'Yoʻq, agar choʻqqi 3000 m dan past boʻlsa',
            'Нет, если вершина ниже 3000 м',
            'No, if the peak is under 3000 m',
          ],
          ['Faqat suvda suzganda', 'Только при купании', 'Only when swimming'],
        ],
        explanation: [
          'Yozda ham yomgʻir, shamol va sovuq kechalar tanani tez sovutadi. Har doim issiq qatlam va yomgʻirpoʻsh oling.',
          'Летом дождь, ветер и холодные ночи тоже быстро остужают тело. Всегда берите утеплитель и дождевик.',
          'Summer rain, wind and cold nights can chill you fast too. Always take a warm layer and a rain jacket.',
        ],
        wrongExplanation: [
          'Sovuq qotish yil boʻyi boʻlishi mumkin. Tayyor boʻling.',
          'Переохлаждение возможно круглый год. Будьте готовы.',
          'Hypothermia can happen in any season. Be ready.',
        ],
      },
      {
        prompt: [
          'Issiqda qanday ichish toʻgʻri?',
          'Как правильно пить в жару?',
          'What is the right way to drink in the heat?',
        ],
        hint: ['Faqat suv emas.', 'Не только вода.', 'Not only water.'],
        answer: [
          'Oz-ozdan, tez-tez, tuz bilan ham',
          'Понемногу, часто, восполняя и соль',
          'Little and often, replacing salt too',
        ],
        wrong: [
          ['Bir martada 2 litr', 'Сразу 2 литра', '2 litres in one go'],
          [
            'Faqat chanqaganda',
            'Только когда хочется пить',
            'Only when thirsty',
          ],
          ['Faqat gazli ichimlik', 'Только газировку', 'Only fizzy drinks'],
        ],
        explanation: [
          'Ter bilan tuz ham yoʻqoladi. Tuzli gazak yoki elektrolit qoʻshilgan suv yordam beradi.',
          'С потом уходит и соль. Помогают солёные перекусы или вода с электролитами.',
          'Sweat carries salt away too. Salty snacks or water with electrolytes help.',
        ],
        wrongExplanation: [
          'Chanqoq kech keladi. Oldindan, oz-ozdan iching.',
          'Жажда приходит поздно. Пейте заранее и понемногу.',
          'Thirst comes late. Drink ahead, a little at a time.',
        ],
      },
      {
        prompt: [
          'Sovuq qotgan odamni isitishda nima qilmaslik kerak?',
          'Чего нельзя делать, согревая переохлаждённого?',
          'What should you NOT do when warming a cold person?',
        ],
        answer: [
          'Issiq suvga solish yoki qoʻl-oyoqni qattiq ishqalash',
          'Опускать в горячую воду или сильно растирать конечности',
          'Put them in hot water or rub their limbs hard',
        ],
        wrong: [
          [
            'Quruq kiyim kiydirish',
            'Переодеть в сухое',
            'Dress them in dry clothes',
          ],
          [
            'Spalnikka solish',
            'Уложить в спальник',
            'Put them in a sleeping bag',
          ],
          [
            'Iliq shirin choy berish (hushi joyida boʻlsa)',
            'Дать тёплый сладкий чай (если в сознании)',
            'Give warm sweet tea (if alert)',
          ],
        ],
        explanation: [
          'Keskin isitish va ishqalash yurak uchun xavfli boʻlishi mumkin. Asta-sekin, tana markazidan isiting.',
          'Резкое согревание и растирание могут быть опасны для сердца. Согревайте постепенно, начиная с туловища.',
          'Rapid rewarming and hard rubbing can be dangerous for the heart. Warm gently, starting with the body core.',
        ],
        wrongExplanation: [
          'Quruq kiyim, spalnik va iliq ichimlik — toʻgʻri harakatlar. Keskin isitish esa xavfli.',
          'Сухая одежда, спальник и тёплое питьё — правильные действия. Опасно резкое согревание.',
          'Dry clothes, a sleeping bag and a warm drink are right. Rapid rewarming is the danger.',
        ],
      },
    ],
  },
  // ───────────────────────── Tier 5 ─────────────────────────
  {
    tierKey: '5',
    icon: 'compass',
    title: [
      'Guruh sayohatini rejalash',
      'Планирование группового похода',
      'Planning a group trip',
    ],
    questions: [
      {
        prompt: [
          'Guruh sayohatida temp kimga moslashadi?',
          'Под кого подстраивается темп группы?',
          'Whose pace does a group follow?',
        ],
        hint: [
          'Hech kim orqada qolmasin.',
          'Никто не должен отставать.',
          'Nobody should be left behind.',
        ],
        answer: [
          'Eng sekin yuradigan odamga',
          'Под самого медленного участника',
          'The slowest member',
        ],
        wrong: [
          [
            'Eng tez yuradigan odamga',
            'Под самого быстрого',
            'The fastest member',
          ],
          [
            'Yetakchiga, boshqalar yetib olsin',
            'Под лидера, остальные догонят',
            'The leader; others catch up',
          ],
          [
            'Har kim oʻz tempida, alohida',
            'Каждый идёт в своём темпе отдельно',
            'Everyone at their own pace, apart',
          ],
        ],
        explanation: [
          'Eng sekin odam oldinroqda yursa, guruh birga qoladi va hech kim haddan tashqari charchamaydi.',
          'Если самый медленный идёт впереди, группа держится вместе и никто не выбивается из сил.',
          'With the slowest person near the front, the group stays together and nobody gets exhausted.',
        ],
        wrongExplanation: [
          'Tez temp sekinroq odamni charchatadi va guruhni boʻladi.',
          'Быстрый темп выматывает медленных и разрывает группу.',
          'A fast pace wears out slower people and splits the group.',
        ],
      },
      {
        prompt: [
          'Rejalashda marshrut haqida nimani bilish kerak?',
          'Что нужно знать о маршруте при планировании?',
          'What do you need to know about the route when planning?',
        ],
        answer: [
          'Masofa, balandlik, vaqt, suv manbalari va qaytish yoʻllari',
          'Расстояние, набор высоты, время, источники воды и пути отхода',
          'Distance, height gain, time, water sources and escape routes',
        ],
        wrong: [
          [
            'Faqat choʻqqi nomi',
            'Только название вершины',
            'Only the name of the peak',
          ],
          [
            'Faqat suratga olish joylari',
            'Только точки для фото',
            'Only photo spots',
          ],
          [
            'Hech narsa, yetakchi biladi',
            'Ничего, лидер знает',
            'Nothing, the leader knows',
          ],
        ],
        explanation: [
          'Bu maʼlumotlar marshrut guruh uchun mosligini va qaytish vaqtini aniqlashga yordam beradi.',
          'Эти данные помогают понять, подходит ли маршрут группе, и назначить время возврата.',
          'This tells you whether the route suits the group and helps you set a turn-around time.',
        ],
        wrongExplanation: [
          'Rejani butun guruh bilishi kerak, faqat yetakchi emas.',
          'План должен знать каждый, а не только лидер.',
          'Everyone should know the plan, not only the leader.',
        ],
      },
      {
        prompt: [
          'Guruhda kim oxirida yuradi?',
          'Кто идёт замыкающим?',
          'Who walks at the back of the group?',
        ],
        hint: [
          'U hech kimni yoʻqotmaydi.',
          'Он никого не теряет.',
          'They make sure no one is lost.',
        ],
        answer: [
          'Tajribali odam — «yopuvchi»',
          'Опытный замыкающий',
          'An experienced sweeper',
        ],
        wrong: [
          [
            'Eng charchagan odam yolgʻiz',
            'Самый уставший, в одиночку',
            'The most tired person, alone',
          ],
          [
            'Hech kim, hamma oʻz holicha',
            'Никто, каждый сам по себе',
            'Nobody in particular',
          ],
          [
            'Eng yangi ishtirokchi',
            'Самый новый участник',
            'The newest member',
          ],
        ],
        explanation: [
          'Yopuvchi orqada qolganlarga yordam beradi va hech kim yoʻqolmasligini taʼminlaydi. Yetakchi bilan aloqa saqlaydi.',
          'Замыкающий помогает отстающим и следит, чтобы никто не потерялся. Он держит связь с ведущим.',
          'The sweeper helps anyone falling behind and makes sure nobody gets lost, staying in touch with the leader.',
        ],
        wrongExplanation: [
          'Oxirda tajribali odam boʻlishi kerak, yolgʻiz charchagan odam emas.',
          'Сзади должен быть опытный человек, а не уставший в одиночку.',
          'The back needs an experienced person, not a tired one alone.',
        ],
      },
      {
        prompt: [
          'Sayohatdan oldin ishtirokchilar haqida nimani bilish kerak?',
          'Что нужно знать об участниках до похода?',
          'What should you know about participants before the trip?',
        ],
        answer: [
          'Tajribasi, tayyorgarligi va muhim sogʻliq holati (masalan, allergiya)',
          'Их опыт, подготовку и важные особенности здоровья (например, аллергию)',
          'Their experience, fitness and key health needs (like allergies)',
        ],
        wrong: [
          ['Faqat ismi', 'Только имена', 'Only their names'],
          ['Hech narsa', 'Ничего', 'Nothing'],
          [
            'Faqat ijtimoiy tarmoqdagi profili',
            'Только профиль в соцсетях',
            'Only their social media',
          ],
        ],
        explanation: [
          'Bu marshrutni guruhga moslashtirishga va favqulodda holatda toʻgʻri harakat qilishga yordam beradi. Maʼlumotni maxfiy saqlang.',
          'Это помогает подобрать маршрут под группу и правильно действовать в ЧП. Храните эти сведения конфиденциально.',
          'It helps you match the route to the group and act right in an emergency. Keep this information private.',
        ],
        wrongExplanation: [
          'Guruh imkoniyatini bilmasdan rejalash xavfli.',
          'Планировать, не зная возможностей группы, опасно.',
          "Planning without knowing the group's abilities is risky.",
        ],
      },
      {
        prompt: [
          'Baʼzi chegara va milliy bogʻ hududlariga borishdan oldin nima tekshiriladi?',
          'Что проверить перед поездкой в пограничные районы и нацпарки?',
          'What do you check before visiting border areas or national parks?',
        ],
        hint: ['Hujjatlar.', 'Документы.', 'Paperwork.'],
        answer: [
          'Ruxsatnoma yoki kirish qoidalari kerakmi',
          'Нужен ли пропуск или особые правила въезда',
          'Whether a permit or entry rules apply',
        ],
        wrong: [
          [
            'Hech narsa, hamma joy ochiq',
            'Ничего, везде открыто',
            'Nothing, everywhere is open',
          ],
          ['Faqat restoranlar', 'Только кафе', 'Only cafés'],
          ['Faqat ob-havo', 'Только погоду', 'Only the weather'],
        ],
        explanation: [
          'Baʼzi chegara hududlari va qoʻriqxonalarga kirish uchun ruxsatnoma kerak. Rasmiy manbalardan oldindan aniqlang.',
          'Для некоторых пограничных зон и заповедников нужен пропуск. Узнайте заранее из официальных источников.',
          'Some border zones and nature reserves require a permit. Check official sources in advance.',
        ],
        wrongExplanation: [
          'Ruxsatnomasiz kirish muammoga olib kelishi mumkin. Oldindan tekshiring.',
          'Вход без пропуска может обернуться проблемами. Проверьте заранее.',
          'Entering without a permit can cause trouble. Check ahead.',
        ],
      },
      {
        prompt: [
          'Uyda qoladigan aloqa odamiga nimani qoldirasiz?',
          'Что оставить контактному лицу, которое остаётся дома?',
          'What do you leave with your contact at home?',
        ],
        answer: [
          'Marshrut, ishtirokchilar, qaytish vaqti va qachon 112 ga qoʻngʻiroq qilish',
          'Маршрут, состав группы, время возврата и когда звонить 112',
          'Route, group list, return time and when to call 112',
        ],
        wrong: [
          [
            'Faqat «tez qaytamiz»',
            'Только «скоро вернёмся»',
            'Just "back soon"',
          ],
          ['Hech narsa', 'Ничего', 'Nothing'],
          ['Faqat mashina rangi', 'Только цвет машины', 'Only the car colour'],
        ],
        explanation: [
          'Aniq kelishuv qiling: «Agar soat 21:00 gacha xabar bermasak, 112 ga qoʻngʻiroq qil». Bu qidiruvni tezlashtiradi.',
          'Договоритесь чётко: «Если не выйдем на связь до 21:00 — звони 112». Это ускорит поиск.',
          'Agree clearly: "If we have not checked in by 9 pm, call 112." It speeds up any search.',
        ],
        wrongExplanation: [
          'Noaniq rejada qidiruv kech boshlanadi. Aniq vaqt belgilang.',
          'При размытом плане поиск начнётся поздно. Назовите точное время.',
          'A vague plan means a late search. Give an exact time.',
        ],
      },
      {
        prompt: [
          'Guruh uchun qaysi jihoz umumiy boʻladi?',
          'Какое снаряжение общее для группы?',
          'Which gear is shared by the group?',
        ],
        hint: [
          'Hamma uchun bitta, lekin hamma biladi.',
          'Одно на всех, но все знают где.',
          'One for all, and everyone knows where.',
        ],
        answer: [
          'Guruh aptechkasi, zaxira xarita va favqulodda boshpana',
          'Групповая аптечка, запасная карта и аварийное укрытие',
          'A group first-aid kit, spare map and emergency shelter',
        ],
        wrong: [
          ['Har kimning suvi', 'Вода каждого', "Everyone's water"],
          ['Shaxsiy dorilar', 'Личные лекарства', 'Personal medicines'],
          [
            'Har kimning issiq kiyimi',
            'Тёплая одежда каждого',
            "Everyone's warm clothes",
          ],
        ],
        explanation: [
          'Umumiy jihozlar kimda ekanini hamma bilsin. Suv, issiq kiyim va shaxsiy dorilar esa har kimda boʻlishi kerak.',
          'Все должны знать, у кого общее снаряжение. Вода, тёплая одежда и личные лекарства — у каждого свои.',
          'Everyone should know who carries the shared gear. Water, warm clothes and personal medicines stay with each person.',
        ],
        wrongExplanation: [
          'Shaxsiy narsalar har kimda boʻlsin, umumiy jihozlar esa guruhda.',
          'Личное — у каждого, общее — у группы.',
          'Personal items stay with each person; shared gear with the group.',
        ],
      },
      {
        prompt: [
          'Kunduzi qancha vaqt yorugʻ boʻlishini nima uchun bilish kerak?',
          'Зачем знать, сколько длится светлое время суток?',
          'Why know how many daylight hours there are?',
        ],
        answer: [
          'Qorongʻi tushmasdan qaytish uchun',
          'Чтобы вернуться до темноты',
          'To be back before dark',
        ],
        wrong: [
          ['Surat uchun', 'Для фото', 'For photos'],
          ['Ahamiyati yoʻq', 'Это неважно', 'It does not matter'],
          ['Faqat yozda kerak', 'Нужно только летом', 'Only in summer'],
        ],
        explanation: [
          'Kuz va qishda kun qisqa. Yoʻl vaqtini yorugʻlikka moslang va fonar oling.',
          'Осенью и зимой день короткий. Планируйте время пути по световому дню и берите фонарь.',
          'Days are short in autumn and winter. Fit the walking time to daylight and carry a headlamp.',
        ],
        wrongExplanation: [
          'Qorongʻida xato va jarohat xavfi oshadi. Yorugʻlikka qarab rejalang.',
          'В темноте растёт риск ошибок и травм. Планируйте по световому дню.',
          'Darkness raises the risk of mistakes and injuries. Plan around daylight.',
        ],
      },
      {
        prompt: [
          'Guruh qancha katta boʻlishi maʼqul?',
          'Каким должен быть размер группы?',
          'What group size is sensible?',
        ],
        hint: [
          'Yetakchi hammani koʻra oladimi?',
          'Видит ли лидер всех?',
          'Can the leader see everyone?',
        ],
        answer: [
          'Yetakchilar hammani nazorat qila oladigan darajada',
          'Такой, чтобы ведущие могли следить за всеми',
          'Small enough for the leaders to look after everyone',
        ],
        wrong: [
          ['Iloji boricha katta', 'Как можно больше', 'As large as possible'],
          ['Doim yolgʻiz', 'Всегда в одиночку', 'Always solo'],
          ['Ahamiyati yoʻq', 'Неважно', 'It does not matter'],
        ],
        explanation: [
          'Katta guruhda odamlar orqada qoladi va qaror qabul qilish qiyinlashadi. Kerak boʻlsa, har birida yetakchi bor kichik guruhlarga boʻling.',
          'В большой группе люди отстают, а решения принимать труднее. При необходимости делитесь на подгруппы, у каждой свой ведущий.',
          'In a big group people fall behind and decisions get harder. If needed, split into smaller groups, each with its own leader.',
        ],
        wrongExplanation: [
          'Guruh hajmi xavfsizlikka taʼsir qiladi. Uni yetakchilar soniga moslang.',
          'Размер группы влияет на безопасность. Подстраивайте его под число ведущих.',
          'Group size affects safety. Match it to the number of leaders.',
        ],
      },
      {
        prompt: [
          'Sayohatdan oldin guruh bilan qisqa yigʻilish nimaga kerak?',
          'Зачем короткий брифинг с группой перед выходом?',
          'Why hold a short briefing with the group before setting off?',
        ],
        answer: [
          'Reja, qaytish vaqti, signallar va xavfli joylarni kelishib olish uchun',
          'Чтобы договориться о плане, времени возврата, сигналах и опасных местах',
          'To agree the plan, turn-around time, signals and hazards',
        ],
        wrong: [
          ['Vaqtni yoʻqotish', 'Это пустая трата времени', 'It wastes time'],
          [
            'Faqat surat uchun',
            'Только для общего фото',
            'Only for a group photo',
          ],
          [
            'Faqat yetakchi uchun',
            'Это нужно только лидеру',
            'Only the leader needs it',
          ],
        ],
        explanation: [
          'Hamma bir xil rejani bilsa, adashgan yoki jarohatlangan odam ham nima qilishni biladi. Har kim savol bera olsin.',
          'Если все знают один план, даже потерявшийся или травмированный знает, что делать. Дайте каждому задать вопросы.',
          'When everyone knows the same plan, even someone lost or hurt knows what to do. Let everyone ask questions.',
        ],
        wrongExplanation: [
          'Besh daqiqalik yigʻilish keyinchalik soatlab muammoning oldini oladi.',
          'Пять минут брифинга экономят часы проблем потом.',
          'Five minutes of briefing saves hours of trouble later.',
        ],
      },
    ],
  },
  {
    tierKey: '5',
    icon: 'mountain',
    title: [
      'Ortga qaytish qarorlari',
      'Решение повернуть назад',
      'Turn-around decisions',
    ],
    questions: [
      {
        prompt: [
          'Togʻdagi eng muhim qoida qaysi?',
          'Какое правило в горах самое главное?',
          'What is the most important rule in the mountains?',
        ],
        hint: [
          'Choʻqqi — yarim yoʻl.',
          'Вершина — это полпути.',
          'The summit is halfway.',
        ],
        answer: [
          'Choʻqqi ixtiyoriy, uyga qaytish majburiy',
          'Вершина — по желанию, возвращение — обязательно',
          'The summit is optional; getting home is mandatory',
        ],
        wrong: [
          [
            'Choʻqqiga har qanday holatda chiqish',
            'Вершина любой ценой',
            'Reach the summit at any cost',
          ],
          [
            'Hech qachon ortga qaytmaslik',
            'Никогда не поворачивать назад',
            'Never turn back',
          ],
          ['Eng tez yetib borish', 'Дойти быстрее всех', 'Be the fastest'],
        ],
        explanation: [
          'Togʻlar joyida qoladi, keyin yana kelish mumkin. Xavfsiz qaytish har doim birinchi oʻrinda.',
          'Горы никуда не денутся, можно вернуться позже. Безопасное возвращение всегда на первом месте.',
          'The mountain will still be there; you can come back. Getting home safely always comes first.',
        ],
        wrongExplanation: [
          'Ortga qaytish — magʻlubiyat emas, aqlli qaror.',
          'Повернуть назад — не поражение, а мудрое решение.',
          'Turning back is not failure; it is a wise choice.',
        ],
      },
      {
        prompt: [
          'Qaytish vaqtiga yetdingiz, choʻqqi esa 20 daqiqa narida. Nima qilasiz?',
          'Время возврата наступило, а до вершины 20 минут. Что делать?',
          'Your turn-around time arrives and the summit is 20 minutes away. What do you do?',
        ],
        answer: [
          'Kelishilgandek ortga qaytish',
          'Повернуть назад, как договорились',
          'Turn back as agreed',
        ],
        wrong: [
          [
            '«Faqat 20 daqiqa» deb davom etish',
            'Идти дальше — «всего 20 минут»',
            'Keep going, it is "only 20 minutes"',
          ],
          [
            'Kim xohlasa, yolgʻiz davom etsin',
            'Кто хочет — пусть идёт один',
            'Let whoever wants go on alone',
          ],
          [
            'Qaytish vaqtini surish',
            'Сдвинуть время возврата',
            'Move the turn-around time',
          ],
        ],
        explanation: [
          '20 daqiqa koʻpincha bir soatga aylanadi, tushish esa charchoq bilan sekinroq. Qaytish vaqti aynan shunday lahzalar uchun belgilanadi.',
          '20 минут часто превращаются в час, а спуск с усталостью идёт медленнее. Время возврата назначают как раз для таких моментов.',
          'Twenty minutes often becomes an hour, and the descent is slower when tired. The turn-around time exists for exactly this moment.',
        ],
        wrongExplanation: [
          'Qaytish vaqtini oʻzgartirish uning maʼnosini yoʻqotadi.',
          'Если двигать время возврата, оно теряет смысл.',
          'Moving the turn-around time defeats its purpose.',
        ],
      },
      {
        prompt: [
          '«Choʻqqi isitmasi» nima?',
          'Что такое «вершинная лихорадка»?',
          'What is "summit fever"?',
        ],
        hint: [
          'Maqsad koʻzni yumdiradi.',
          'Цель ослепляет.',
          'The goal blinds you.',
        ],
        answer: [
          'Choʻqqiga intilib, xavf belgilarini eʼtiborsiz qoldirish',
          'Желание вершины, из-за которого игнорируют признаки опасности',
          'Wanting the summit so much you ignore warning signs',
        ],
        wrong: [
          [
            'Balandlikda harorat koʻtarilishi',
            'Повышение температуры на высоте',
            'A high temperature at altitude',
          ],
          [
            'Choʻqqidagi issiq havo',
            'Жаркая погода на вершине',
            'Hot weather on the summit',
          ],
          ['Choʻqqidagi bayram', 'Праздник на вершине', 'A summit party'],
        ],
        explanation: [
          'Koʻp baxtsiz hodisalar odamlar «deyarli yetib keldik» deb ogohlantirishlarga quloq solmaganda boʻladi. Belgilarni ochiq muhokama qiling.',
          'Многие несчастные случаи происходят, когда люди думают «почти дошли» и не слышат предупреждений. Обсуждайте признаки открыто.',
          'Many accidents happen when people think "we are almost there" and ignore warnings. Talk about the signs openly.',
        ],
        wrongExplanation: [
          'Bu kasallik emas, fikrlash tuzogʻi. Uni bilib, undan saqlaning.',
          'Это не болезнь, а ловушка мышления. Знайте о ней и избегайте.',
          'It is not an illness but a thinking trap. Know it and avoid it.',
        ],
      },
      {
        prompt: [
          'Guruhda kim «ortga qaytamiz» deyishi mumkin?',
          'Кто в группе может сказать «поворачиваем»?',
          'Who in the group can call a turn-around?',
        ],
        answer: ['Har qanday ishtirokchi', 'Любой участник', 'Any member'],
        wrong: [
          ['Faqat yetakchi', 'Только руководитель', 'Only the leader'],
          [
            'Faqat eng tajribali',
            'Только самый опытный',
            'Only the most experienced',
          ],
          [
            'Hech kim, reja oʻzgarmaydi',
            'Никто, план не меняется',
            'Nobody, the plan is fixed',
          ],
        ],
        explanation: [
          'Har kim oʻzini yomon his qilsa yoki xavfni sezsa, aytishi kerak. Guruh bunday ovozni hurmat qiladi.',
          'Любой, кто чувствует себя плохо или видит опасность, должен сказать об этом. Группа уважает такой голос.',
          'Anyone who feels unwell or sees danger should speak up. The group respects that voice.',
        ],
        wrongExplanation: [
          'Xavfni yetakchi koʻrmasligi mumkin. Har bir ovoz muhim.',
          'Лидер может не заметить опасность. Каждый голос важен.',
          'The leader may miss a danger. Every voice matters.',
        ],
      },
      {
        prompt: [
          'Qaysi holat ortga qaytish uchun sabab?',
          'Что из этого — повод повернуть назад?',
          'Which of these is a reason to turn back?',
        ],
        hint: ['Bittasi yetarli.', 'Достаточно одного.', 'One is enough.'],
        answer: [
          'Ob-havo yomonlashmoqda yoki kimdir oʻzini yomon his qilyapti',
          'Портится погода или кому-то плохо',
          'The weather is turning or someone feels unwell',
        ],
        wrong: [
          [
            'Surat chiroyli chiqmadi',
            'Фото получились неудачными',
            'The photos are not good',
          ],
          [
            'Choʻqqi koʻrinib turibdi',
            'Вершина уже видна',
            'The summit is in sight',
          ],
          [
            'Boshqa guruh davom etyapti',
            'Другая группа идёт дальше',
            'Another group is carrying on',
          ],
        ],
        explanation: [
          'Ob-havo, sogʻliq, vaqt yoki sharoitdagi har bir xavf belgisi qaytish uchun yetarli sabab.',
          'Любой тревожный сигнал — погода, здоровье, время или условия — достаточная причина повернуть.',
          'Any warning sign about weather, health, time or conditions is enough reason to turn back.',
        ],
        wrongExplanation: [
          'Boshqa guruh davom etishi siz uchun xavfsiz degani emas.',
          'То, что другие идут дальше, не значит, что вам безопасно.',
          'Another group going on does not make it safe for you.',
        ],
      },
      {
        prompt: [
          'Nega koʻp baxtsiz hodisalar tushishda yuz beradi?',
          'Почему многие несчастные случаи происходят на спуске?',
          'Why do many accidents happen on the way down?',
        ],
        answer: [
          'Odamlar charchagan, shoshilgan va diqqati susaygan',
          'Люди устали, спешат и теряют внимание',
          'People are tired, rushing and less focused',
        ],
        wrong: [
          [
            'Tushish har doim xavfsiz',
            'Спуск всегда безопасен',
            'Descents are always safe',
          ],
          [
            'Pastda tosh koʻp',
            'Внизу больше камней',
            'There are more rocks lower down',
          ],
          [
            'Tasodif, sababi yoʻq',
            'Случайность, причины нет',
            'Pure chance, no reason',
          ],
        ],
        explanation: [
          'Kuchingizni tushish uchun ham saqlang. Choʻqqida dam oling, ovqatlaning va sekin tushing.',
          'Оставляйте силы на спуск. Отдохните и поешьте на вершине, спускайтесь не спеша.',
          'Save energy for the descent. Rest and eat at the top, then go down without rushing.',
        ],
        wrongExplanation: [
          'Tushish — yoʻlning eng xavfli qismlaridan biri. Diqqatni saqlang.',
          'Спуск — одна из самых опасных частей пути. Сохраняйте внимание.',
          'The descent is one of the riskiest parts. Stay focused.',
        ],
      },
      {
        prompt: [
          'Koʻp kuch va pul sarflangan sayohatda qaytish qiyin. Bu qanday tuzoq?',
          'Трудно повернуть, когда вложено много сил и денег. Что это за ловушка?',
          'It is hard to turn back after investing time and money. What trap is this?',
        ],
        hint: [
          'Oʻtgan xarajat qaytmaydi.',
          'Потраченное не вернуть.',
          'What is spent is gone.',
        ],
        answer: [
          'Sarflangan xarajat tuzogʻi',
          'Ловушка невозвратных затрат',
          'The sunk-cost trap',
        ],
        wrong: [
          [
            'Bu tuzoq emas, toʻgʻri fikr',
            'Это не ловушка, а правильная мысль',
            'It is not a trap, it is good thinking',
          ],
          ['Balandlik kasalligi', 'Горная болезнь', 'Altitude sickness'],
          ['Charchoq', 'Усталость', 'Tiredness'],
        ],
        explanation: [
          'Sarflangan vaqt va pul hozirgi xavfni oʻzgartirmaydi. Qarorni faqat hozirgi sharoitga qarab qabul qiling.',
          'Потраченные время и деньги не меняют текущую опасность. Решайте по нынешним условиям.',
          "Time and money already spent do not change today's danger. Decide only on current conditions.",
        ],
        wrongExplanation: [
          'Bu xavfli fikrlash tuzogʻi. Xarajat emas, xavfsizlik muhim.',
          'Это опасная ловушка мышления. Важна безопасность, а не затраты.',
          'It is a dangerous thinking trap. Safety matters, not the cost.',
        ],
      },
      {
        prompt: [
          'Guruh ikki fikrga boʻlindi: biri davom etmoqchi, biri qaytmoqchi. Nima qilasiz?',
          'Группа разделилась во мнениях: одни хотят идти, другие вернуться. Что делать?',
          'The group is split: some want to go on, others to turn back. What do you do?',
        ],
        answer: [
          'Hammasi birga, xavfsizroq variantni tanlab qaytish',
          'Всем вместе выбрать более безопасный вариант и вернуться',
          'Stay together and take the safer option: turn back',
        ],
        wrong: [
          [
            'Guruhni ikkiga boʻlish',
            'Разделиться на две группы',
            'Split into two groups',
          ],
          [
            'Ovoz berib, ozchilikni tashlab ketish',
            'Проголосовать и оставить меньшинство',
            'Vote and leave the minority',
          ],
          [
            'Bahslashib vaqt yoʻqotish',
            'Спорить и терять время',
            'Argue and lose time',
          ],
        ],
        explanation: [
          'Shubha boʻlsa, xavfsizroq yoʻl tanlanadi. Guruhni boʻlish favqulodda holatda yordamni qiyinlashtiradi.',
          'При сомнениях выбирают более безопасный вариант. Разделение группы осложняет помощь в ЧП.',
          'When in doubt, take the safer choice. Splitting up makes helping in an emergency harder.',
        ],
        wrongExplanation: [
          'Guruhni boʻlmang. Birga, xavfsizroq qarorni tanlang.',
          'Не разделяйтесь. Вместе выбирайте более безопасное решение.',
          'Do not split. Choose the safer decision together.',
        ],
      },
      {
        prompt: [
          'Qaytish vaqtini qachon belgilash kerak?',
          'Когда назначать время возврата?',
          'When should you set the turn-around time?',
        ],
        hint: [
          'Bosh sovuq paytda.',
          'Пока голова холодная.',
          'While your head is clear.',
        ],
        answer: [
          'Sayohatdan oldin, xotirjam vaziyatda',
          'До похода, в спокойной обстановке',
          'Before the trip, while calm',
        ],
        wrong: [
          ['Choʻqqi yaqinida', 'У самой вершины', 'Near the summit'],
          ['Charchaganda', 'Когда устанешь', 'When you get tired'],
          ['Hech qachon', 'Никогда', 'Never'],
        ],
        explanation: [
          'Oldindan belgilangan vaqt charchoq va hayajon taʼsiridagi qarorlardan himoya qiladi.',
          'Заранее назначенное время защищает от решений, принятых в усталости и азарте.',
          'A time set in advance protects you from decisions made while tired or excited.',
        ],
        wrongExplanation: [
          'Choʻqqi yaqinida fikrlash qiyin. Vaqtni oldindan belgilang.',
          'У вершины трудно мыслить трезво. Назначайте время заранее.',
          'Near the summit it is hard to think clearly. Set the time beforehand.',
        ],
      },
      {
        prompt: [
          'Ortga qaytgan guruh haqida qaysi fikr toʻgʻri?',
          'Что верно про группу, которая повернула назад?',
          'What is true about a group that turned back?',
        ],
        answer: [
          'Ular yaxshi qaror qildi va keyin yana kelishi mumkin',
          'Они приняли хорошее решение и смогут вернуться позже',
          'They made a good decision and can come back another day',
        ],
        wrong: [
          ['Ular magʻlub boʻldi', 'Они проиграли', 'They failed'],
          [
            'Ular vaqtni behuda sarfladi',
            'Они зря потратили время',
            'They wasted their time',
          ],
          ['Ular kuchsiz', 'Они слабые', 'They are weak'],
        ],
        explanation: [
          'Tajribali alpinistlar koʻp marta ortga qaytgan. Aynan shuning uchun ular hali ham togʻlarga boradi.',
          'Опытные альпинисты много раз поворачивали назад. Именно поэтому они до сих пор ходят в горы.',
          'Experienced mountaineers have turned back many times. That is why they still go to the mountains.',
        ],
        wrongExplanation: [
          'Qaytish — kuch belgisi, zaiflik emas.',
          'Повернуть назад — признак силы, а не слабости.',
          'Turning back is a sign of strength, not weakness.',
        ],
      },
    ],
  },
  {
    tierKey: '5',
    icon: 'bolt',
    title: [
      'Guruhdagi favqulodda holatlar',
      'ЧП в группе',
      'Group emergencies',
    ],
    questions: [
      {
        prompt: [
          'Guruhda baxtsiz hodisa yuz berdi. Yetakchining birinchi vazifasi?',
          'В группе несчастный случай. Первая задача ведущего?',
          "There is an accident in the group. What is the leader's first task?",
        ],
        hint: [
          'Yangi jabrlanuvchi boʻlmasin.',
          'Чтобы не было новых пострадавших.',
          'No new casualties.',
        ],
        answer: [
          'Tinchlanish va hammaning xavfsizligini taʼminlash',
          'Сохранить спокойствие и обеспечить безопасность всех',
          'Stay calm and make everyone safe',
        ],
        wrong: [
          [
            'Hamma bir vaqtda yordamga yugursin',
            'Всем сразу бежать на помощь',
            'Everyone rushes to help at once',
          ],
          ['Suratga olish', 'Снимать на видео', 'Film it'],
          [
            'Darhol guruhni tarqatib yuborish',
            'Сразу распустить группу',
            'Send everyone off in different directions',
          ],
        ],
        explanation: [
          'Avval xavfni toʻxtating, keyin jabrlanuvchiga yordam bering va 112 ga qoʻngʻiroq qiling. Har kimga aniq vazifa bering.',
          'Сначала устраните опасность, затем помогайте пострадавшему и звоните 112. Дайте каждому чёткую задачу.',
          'First remove the danger, then help the injured person and call 112. Give each person a clear job.',
        ],
        wrongExplanation: [
          'Tartibsiz harakat yangi jarohatlarga olib keladi. Tinch va tartibli boʻling.',
          'Хаос приводит к новым травмам. Действуйте спокойно и по порядку.',
          'Chaos leads to more injuries. Act calmly and in order.',
        ],
      },
      {
        prompt: [
          'Aloqa yoʻq va yordam chaqirish uchun kimdir ketishi kerak. Kim boradi?',
          'Связи нет, кто-то должен идти за помощью. Кто?',
          'There is no signal and someone must go for help. Who goes?',
        ],
        answer: [
          'Kamida ikki kishi, joylashuv yozilgan qogʻoz bilan',
          'Минимум двое, с записанными координатами',
          'At least two people, with the location written down',
        ],
        wrong: [
          ['Bitta odam yolgʻiz', 'Один человек в одиночку', 'One person alone'],
          [
            'Butun guruh, jabrlanuvchini qoldirib',
            'Вся группа, оставив пострадавшего',
            'The whole group, leaving the injured person',
          ],
          ['Jabrlanuvchining oʻzi', 'Сам пострадавший', 'The injured person'],
        ],
        explanation: [
          'Ikki kishi bir-birini qoʻllaydi. Koordinatalar, jarohat va guruh tarkibini yozib bering. Jabrlanuvchi bilan ham kimdir qolsin.',
          'Двое страхуют друг друга. Запишите им координаты, характер травмы и состав группы. С пострадавшим тоже кто-то остаётся.',
          'Two people can look after each other. Write down the coordinates, the injury and the group details. Someone also stays with the injured.',
        ],
        wrongExplanation: [
          'Yolgʻiz odam ham jarohat olishi mumkin. Jabrlanuvchini yolgʻiz qoldirmang.',
          'Один человек тоже может пострадать. Пострадавшего одного не оставляйте.',
          'A lone messenger can get hurt too. Never leave the injured person alone.',
        ],
      },
      {
        prompt: [
          'Aloqa juda zaif. Qanday qilib xabar yuborasiz?',
          'Связь очень слабая. Как передать сообщение?',
          'The signal is very weak. How do you get a message out?',
        ],
        hint: [
          'Qisqa xabar oson oʻtadi.',
          'Короткое сообщение проходит легче.',
          'Short messages get through more easily.',
        ],
        answer: [
          'SMS yuborish yoki balandroq joyga chiqib urinish',
          'Отправить SMS или подняться повыше и попробовать снова',
          'Send an SMS or move higher and try again',
        ],
        wrong: [
          ['Video yuborish', 'Отправить видео', 'Send a video'],
          [
            'Telefonni oʻchirib qoʻyish',
            'Выключить телефон',
            'Turn the phone off',
          ],
          ['Urinmaslik', 'Не пытаться', 'Do not try'],
        ],
        explanation: [
          'SMS zaif signalda ham oʻtishi mumkin. Xabarda joylashuv, nima boʻlgani va odamlar sonini yozing.',
          'SMS может пройти даже при слабом сигнале. Укажите координаты, что случилось и сколько людей.',
          'An SMS can get through on a weak signal. Include the location, what happened and how many people.',
        ],
        wrongExplanation: [
          'Katta fayllar zaif aloqada oʻtmaydi. Qisqa matn yuboring.',
          'Большие файлы при слабой связи не уйдут. Отправляйте короткий текст.',
          'Large files will not send on weak signal. Send short text.',
        ],
      },
      {
        prompt: [
          'Guruhdan bir kishi yoʻqolib qoldi. Avval nima qilasiz?',
          'Один участник пропал. Что делать сначала?',
          'One person is missing from the group. What do you do first?',
        ],
        answer: [
          'Toʻxtash, chaqirish va hushtak chalish, oxirgi koʻrilgan joyni aniqlash',
          'Остановиться, звать и свистеть, определить, где его видели последний раз',
          'Stop, call and whistle, and work out where they were last seen',
        ],
        wrong: [
          [
            'Hamma har tomonga qidirishga tarqalsin',
            'Всем разбежаться искать в разные стороны',
            'Everyone scatters to search',
          ],
          [
            'Davom etib, keyin yetib olishini kutish',
            'Идти дальше и ждать, что догонит',
            'Carry on and expect them to catch up',
          ],
          ['Ertaga qidirish', 'Искать завтра', 'Search tomorrow'],
        ],
        explanation: [
          'Guruh birga qolishi kerak, aks holda yana kimdir yoʻqoladi. Tez topilmasa, 112 ga qoʻngʻiroq qiling.',
          'Группа должна держаться вместе, иначе потеряется кто-то ещё. Если быстро найти не удалось — звоните 112.',
          'The group must stay together or someone else gets lost. If you cannot find them quickly, call 112.',
        ],
        wrongExplanation: [
          'Tarqalib qidirish yangi yoʻqolganlarga olib keladi.',
          'Поиск вразброд приводит к новым потерявшимся.',
          'Scattering to search creates more lost people.',
        ],
      },
      {
        prompt: [
          'Jabrlanuvchi bilan qutqaruvchilarni kutayotganda nima muhim?',
          'Что важно, пока ждёте спасателей с пострадавшим?',
          'What matters while you wait for rescuers with an injured person?',
        ],
        hint: [
          'Yerdan sovuq keladi.',
          'Холод идёт от земли.',
          'Cold comes from the ground.',
        ],
        answer: [
          'Uni issiq saqlash, yerdan izolyatsiya qilish va holatini kuzatish',
          'Держать в тепле, изолировать от земли и следить за состоянием',
          'Keep them warm, insulated from the ground, and watch their condition',
        ],
        wrong: [
          [
            'Uni yolgʻiz qoldirib, yordam qidirish',
            'Оставить одного и искать помощь',
            'Leave them alone to look for help',
          ],
          ['Koʻp ovqat berish', 'Обильно кормить', 'Give lots of food'],
          [
            'Doim qimirlatib turish',
            'Постоянно его перемещать',
            'Keep moving them around',
          ],
        ],
        explanation: [
          'Harakatsiz odam tez soviydi. Gilamcha va kiyim bilan yoping, nafas va hushni muntazam tekshiring va oʻzgarishlarni yozib boring.',
          'Неподвижный человек быстро остывает. Укройте ковриком и одеждой, регулярно проверяйте дыхание и сознание, записывайте изменения.',
          'A still person cools fast. Use pads and clothes, check breathing and response regularly, and write down any changes.',
        ],
        wrongExplanation: [
          'Jabrlanuvchini yolgʻiz qoldirmang va keraksiz qimirlatmang.',
          'Не оставляйте пострадавшего одного и не двигайте без нужды.',
          'Do not leave the injured alone or move them without need.',
        ],
      },
      {
        prompt: [
          'Qutqaruvchilarga uzoqdan qanday belgi berasiz?',
          'Как подать сигнал спасателям издалека?',
          'How do you signal rescuers from a distance?',
        ],
        answer: [
          'Uch marta hushtak yoki chiroq signali, yorqin kiyimni koʻrsatish',
          'Три свистка или вспышки фонаря, яркая одежда на виду',
          'Three whistle blasts or light flashes, and bright clothing on show',
        ],
        wrong: [
          [
            'Gulxan yoqib, oʻrmonni yondirish',
            'Поджечь лес, чтобы увидели',
            'Set the forest on fire',
          ],
          ['Jim yashirinib oʻtirish', 'Тихо прятаться', 'Hide quietly'],
          ['Faqat baqirish', 'Только кричать', 'Only shout'],
        ],
        explanation: [
          'Uch takroriy signal — xalqaro yordam belgisi. Qorongʻida fonar, kunduzi yorqin rangli kiyim yaxshi koʻrinadi.',
          'Три повторяющихся сигнала — международный знак бедствия. Ночью виден фонарь, днём — яркая одежда.',
          'Any signal repeated three times is an international call for help. A headlamp shows at night; bright clothing by day.',
        ],
        wrongExplanation: [
          'Ovoz tez tugaydi, yongʻin esa yangi falokat. Hushtak va chiroqdan foydalaning.',
          'Голос быстро садится, а пожар — новая беда. Используйте свисток и фонарь.',
          'Your voice gives out, and a fire is a new disaster. Use a whistle and light.',
        ],
      },
      {
        prompt: [
          'Qorongʻida qoldingiz va pastga tushish xavfli. Nima qilasiz?',
          'Вас застала темнота, спуск опасен. Что делать?',
          'Darkness falls and descending is dangerous. What do you do?',
        ],
        hint: [
          'BaÊ¼zan qolish — eng xavfsiz yoʻl.',
          'Иногда остаться — самое безопасное.',
          'Sometimes staying is safest.',
        ],
        answer: [
          'Xavfsiz joyda toʻxtab, isinib, tong otishini kutish',
          'Остановиться в безопасном месте, утеплиться и ждать рассвета',
          'Stop in a safe spot, get warm and wait for daylight',
        ],
        wrong: [
          [
            'Qorongʻida qisqa yoʻl bilan tushish',
            'Спускаться в темноте напрямик',
            'Take a shortcut down in the dark',
          ],
          [
            'Guruhni boʻlib, kim tez boʻlsa ketsin',
            'Разделиться, быстрые пусть уходят',
            'Split up so the fast ones leave',
          ],
          ['Yugurib tushish', 'Бежать вниз', 'Run down'],
        ],
        explanation: [
          'Rejalashtirilmagan tunash qorongʻida yiqilishdan xavfsizroq. Hammani bir joyga yigʻing, issiq kiyim kiying va aloqa odamiga xabar bering.',
          'Незапланированная ночёвка безопаснее падения в темноте. Соберитесь вместе, утеплитесь и сообщите контактному лицу.',
          'An unplanned night out is safer than a fall in the dark. Huddle together, put on warm layers and update your contact.',
        ],
        wrongExplanation: [
          'Qorongʻida shoshilish xavfni koʻpaytiradi. Toʻxtang va kuting.',
          'Спешка в темноте умножает риск. Остановитесь и ждите.',
          'Rushing in the dark multiplies the risk. Stop and wait.',
        ],
      },
      {
        prompt: [
          'Vertolyot yaqinlashmoqda. Guruh nima qiladi?',
          'Приближается вертолёт. Что делает группа?',
          'A helicopter is approaching. What does the group do?',
        ],
        answer: [
          'Narsalarni mahkamlab, ekipaj koʻrsatmasisiz yaqinlashmaslik',
          'Закрепить вещи и не подходить без команды экипажа',
          'Secure loose items and do not approach until the crew signals',
        ],
        wrong: [
          [
            'Vertolyotga qarab yugurish',
            'Бежать к вертолёту',
            'Run towards the helicopter',
          ],
          [
            'Yengil narsalarni silkitish',
            'Размахивать лёгкими вещами',
            'Wave loose tarps and bags',
          ],
          [
            'Qiyalikning yuqori tomonidan yaqinlashish',
            'Подходить со стороны склона сверху',
            'Approach from the uphill side',
          ],
        ],
        explanation: [
          'Parraklar shamoli yengil narsalarni uchirib yuboradi. Faqat ekipaj koʻrsatsa va pastdan, uchuvchi koʻradigan tomondan yaqinlashing.',
          'Поток от винтов уносит лёгкие вещи. Подходите только по сигналу экипажа, снизу по склону и в поле зрения пилота.',
          'Rotor wash blows loose items away. Approach only when the crew signals, from downhill and where the pilot can see you.',
        ],
        wrongExplanation: [
          'Vertolyot yonida shoshilish xavfli. Ekipajni kuting.',
          'Спешка у вертолёта опасна. Ждите команды экипажа.',
          'Rushing near a helicopter is dangerous. Wait for the crew.',
        ],
      },
      {
        prompt: [
          'Favqulodda holatda telefon quvvatini qanday tejash kerak?',
          'Как беречь заряд телефона во время ЧП?',
          'How do you save phone battery during an emergency?',
        ],
        hint: [
          'Hammaning telefoni bir vaqtda kerak emas.',
          'Не все телефоны нужны одновременно.',
          'Not every phone is needed at once.',
        ],
        answer: [
          'Bitta telefonni ishlatib, boshqalarini oʻchirib saqlash',
          'Пользоваться одним телефоном, остальные держать выключенными',
          'Use one phone and keep the others switched off',
        ],
        wrong: [
          [
            'Hamma bir vaqtda qoʻngʻiroq qilsin',
            'Всем звонить одновременно',
            'Everyone calls at once',
          ],
          [
            'Ijtimoiy tarmoqqa yozish',
            'Писать в соцсети',
            'Post on social media',
          ],
          ['Video yozib olish', 'Снимать видео', 'Record videos'],
        ],
        explanation: [
          'Zaxira telefonlar keyin qutqaruvchilar bilan aloqa uchun kerak boʻladi. Ularni issiq joyda saqlang.',
          'Запасные телефоны понадобятся позже для связи со спасателями. Держите их в тепле.',
          'The spare phones will be needed later to talk to rescuers. Keep them warm.',
        ],
        wrongExplanation: [
          'Quvvat — favqulodda holatda eng qimmat resurs. Uni tejang.',
          'Заряд — самый ценный ресурс в ЧП. Берегите его.',
          'Battery is your most precious resource in an emergency. Save it.',
        ],
      },
      {
        prompt: [
          'Favqulodda holatdan keyin guruh nima qiladi?',
          'Что делает группа после ЧП?',
          'What does the group do after an emergency?',
        ],
        answer: [
          'Nima boʻlganini tinch muhokama qilib, xulosa chiqarish',
          'Спокойно обсудить, что произошло, и сделать выводы',
          'Calmly talk through what happened and learn from it',
        ],
        wrong: [
          [
            'Aybdorni qidirish',
            'Искать виноватого',
            'Look for someone to blame',
          ],
          [
            'Hech qachon gapirmaslik',
            'Никогда не обсуждать',
            'Never talk about it',
          ],
          [
            'Togʻlarga boshqa bormaslik',
            'Больше никогда не ходить в горы',
            'Never go to the mountains again',
          ],
        ],
        explanation: [
          'Ayb qidirmasdan muhokama qilish keyingi safar xavfsizroq boʻlishga yordam beradi. Kerak boʻlsa, ruhiy yordam ham soʻrang.',
          'Разбор без поиска виноватых делает следующий поход безопаснее. При необходимости обратитесь и за психологической поддержкой.',
          'Talking it through without blame makes the next trip safer. Seek emotional support too if anyone needs it.',
        ],
        wrongExplanation: [
          'Ayblash oʻrganishga xalaqit beradi. Birga xulosa chiqaring.',
          'Обвинения мешают учиться. Делайте выводы вместе.',
          'Blame gets in the way of learning. Draw lessons together.',
        ],
      },
    ],
  },
];
