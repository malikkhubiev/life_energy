# Сайт «Верни себе себя»

Статический лендинг. Экраны: герой → «тебе не нужно становиться другой» → «тобой управляет состояние» → узнавание себя → что изменится → методология → автор → результаты до/после → формат → кому не подходит → цена. На герое и в блоке оплаты — таймер до 10 октября и «Осталось 20 мест». Все кнопки (класс `js-bot`) ведут в `@teacher_life_bot` с токеном трекинга.

Если сайт на Vercel, а API на Render — в коде уже стоит `LIFE_API = https://million-zcqy.onrender.com`. Переопределить можно так:

```html
<script>window.LIFE_API = "https://million-zcqy.onrender.com";</script>
```

Лендинг: https://life-energy-phi.vercel.app/  
API / бот: https://million-zcqy.onrender.com  

## Прозрачность поведения

Сайт пишет в API визит с:

- доскроллом до каждой секции;
- временем до первой видимости секции (`time_to`);
- временем удержания в секции (`dwell`);
- UTM / yclid;
- флагом клика в Telegram и флагом `bot_started` (проставляется ботом).

Дашборд (без пароля): https://million-zcqy.onrender.com/admin/behavior  
JSON: https://million-zcqy.onrender.com/api/behavior/stats  

Там avg / median / min / max, разбивка «стартовал бота / нет» и по `utm_content`.

Метрика параллельно получает цели и параметры для Директа — но «контроль кампании глазами» смотри в дашборде.

## Метрика `112323537`

### Цели доскролла

Создайте цели типа **JavaScript-событие**:

| Цель | Секция |
| --- | --- |
| `headline_1` / `section_top` | Верни себе себя |
| `headline_2` / `section_one` | Тебе не нужно становиться другой |
| `headline_3` / `section_feel` | Тобой управляет состояние |
| `headline_4` / `section_recognize` | Ты узнаешь себя? |
| `headline_5` / `section_manifesto` | Когда ты управляешь состоянием |
| `headline_6` / `section_method` | Управление состоянием |
| `headline_7` / `section_author` | Малик Хубиев |
| `headline_11` / `section_results` | До и после |
| `headline_9` / `section_inside` | Голос. Практика. Опыт |
| `headline_12` / `section_not_for` | Кому не подходит |
| `headline_10` / `section_purchase` | Прикоснись к себе настоящей |

Параметры визита: `tt_<section>` (сек. до секции), `dw_<section>` (сек. в секции), `utm_content`, `tg_click`.

### Сегменты «хороший / плохой»

В Метрике:

1. Сегмент **Хорошие** — достигли цели `bot_started`.
2. Сегмент **Плохие** — не достигли `bot_started`.
3. В отчётах по параметрам визита / конверсии целей сравнивайте два сегмента.

Точные avg/median/min/max по секциям — в дашборде `/admin/behavior` (Метрика даёт воронку и средние, но не медиану кастомных таймингов).

### Цели для Яндекс.Директа

| Цель | Где | Ценность | Зачем |
| --- | --- | --- | --- |
| `view_offer` | доскролл до оплаты | 50 ₽ | просмотр оффера |
| `tg_click` | клик в Telegram на сайте | 30 ₽ | намерение |
| `bot_started` | /start в боте | 150 ₽ | Telegram + запуск |
| `show_phone` | «Показать номер» в боте | 1 000 ₽ | контакт |
| `payment_started` | клик «Оплатить» в боте | 15 000 ₽ | сильное намерение |
| `payment_success` | ЮKassa succeeded | 50 000 ₽ | деньги + ecommerce |

Оптимизация кампании: в итоге на `payment_success`; пока мало оплат — на `payment_started` или `show_phone`.

Включите **электронную коммерцию** и **Measurement Protocol** (`METRIKA_MP_TOKEN` на сервере).

## UTM для 9 объявлений Яндекс.Директа

Общий шаблон ссылки на лендинг:

```
https://life-energy-phi.vercel.app/?utm_source=yandex&utm_medium=cpc&utm_campaign=CAMPAIGN&utm_content=AD&utm_term={keyword}
```

`{keyword}` подставляет Директ. В интерфейсе объявления: «Параметры URL» → эти метки.  
В отчётах Метрики и в `/admin/behavior` объявления различаются по `utm_content`.

### Группа «Проблемы» → `utm_campaign=problems`

| Объявление | utm_content | Готовая строка меток |
| --- | --- | --- |
| Почему жизнь больше не радует? | `prob_life_no_joy` | `utm_source=yandex&utm_medium=cpc&utm_campaign=problems&utm_content=prob_life_no_joy&utm_term={keyword}` |
| Куда исчезла твоя энергия? | `prob_energy_gone` | `utm_source=yandex&utm_medium=cpc&utm_campaign=problems&utm_content=prob_energy_gone&utm_term={keyword}` |
| Почему ты постоянно на пределе? | `prob_on_edge` | `utm_source=yandex&utm_medium=cpc&utm_campaign=problems&utm_content=prob_on_edge&utm_term={keyword}` |

### Группа «Решения» → `utm_campaign=solutions`

| Объявление | utm_content | Готовая строка меток |
| --- | --- | --- |
| Практики для энергии и спокойствия | `sol_practices` | `utm_source=yandex&utm_medium=cpc&utm_campaign=solutions&utm_content=sol_practices&utm_term={keyword}` |
| Пойми, как устроено твоё состояние | `sol_understand` | `utm_source=yandex&utm_medium=cpc&utm_campaign=solutions&utm_content=sol_understand&utm_term={keyword}` |
| Трансформация начинается с состояния | `sol_starts_state` | `utm_source=yandex&utm_medium=cpc&utm_campaign=solutions&utm_content=sol_starts_state&utm_term={keyword}` |

### Группа «Премиум-lifestyle» → `utm_campaign=premium`

| Объявление | utm_content | Готовая строка меток |
| --- | --- | --- |
| Красивой жизни мало. Важно её чувствовать | `prem_feel_life` | `utm_source=yandex&utm_medium=cpc&utm_campaign=premium&utm_content=prem_feel_life&utm_term={keyword}` |
| Твоя жизнь принадлежит тебе | `prem_belongs_you` | `utm_source=yandex&utm_medium=cpc&utm_campaign=premium&utm_content=prem_belongs_you&utm_term={keyword}` |
| Высокий уровень жизни начинается внутри | `prem_inside` | `utm_source=yandex&utm_medium=cpc&utm_campaign=premium&utm_content=prem_inside&utm_term={keyword}` |

### Настройка в Директе

1. В каждой группе объявлений откройте объявление → **Параметры URL**.
2. Вставьте строку меток из таблицы (или заполните поля Source / Medium / Campaign / Content / Term).
3. Term = `{keyword}` (динамическая подстановка).
4. В стратегиях укажите цели Метрики выше; для отчётов по креативам смотрите группировку по `utm_content` или условие «Метка Content».
5. Включите автопометку Яндекс.Директа (`yclid`) — она уже уходит в бот и в behavior.
