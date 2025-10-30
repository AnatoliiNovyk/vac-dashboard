Промпт: Виправити розміщення графіків у HR (горизонтальна сітка, під календарем/таблицями)

Мета

- Розмістити блок аналітики (графіки) тільки у вкладці HR нижче головних даних (фільтри/календар/таблиці).
- Вирівняти графіки горизонтально у responsive‑сітці:
    - ≥1280px: 3 колонки (3 графіки в ряд),
    - 1024–1279px: 2 колонки,
    - <1024px: 1 колонка (стек).
- Не чіпати Manager/My View (без графіків).
- Нічого не видаляти; мінімальні правки, окремий changelog.

Крок 0 — Check \& Plan

- Знайди контейнер HR вкладки (наприклад, HRPanel.tsx/HRPage.tsx).
- Перевір, де саме монтується <HRAnalytics/> зараз: він НЕ повинен стояти над календарем/таблицею.
- Перевір CSS/клас контейнера (flex-col/flex-row, order, position). Занотуй причину вертикального стеку та “переносу вгору”.

Крок 1 — Перемістити блок графіків нижче головних даних

- У HRPanel: рендер послідовність:

1) Header з метаданими (якщо є),
2) Фільтри/контроли,
3) Календар + Список періодів / Таблиця (головні дані),
4) Блок графіків <HRAnalytics/> (тільки тут).
- Заборонено рендерити <HRAnalytics/> у шапці або над головними даними, а також замінювати існуючий layout.

Крок 2 — Горизонтальна сітка для графіків

- Створи/використай контейнер із CSS Grid або Tailwind‑класи:
    - grid grid-cols-1 gap-6
    - @media ≥1024px: grid-cols-2
    - @media ≥1280px: grid-cols-3
- Кожен графік обгорни у “chart‑card” з фіксованою мінімальною висотою (наприклад, min-h-[280px]/[320px]) та контейнером, що розтягується (для responsive canvas/SVG).
- Заборонено тягнути графіки в один стовпець без grid‑контейнера.

Крок 3 — Sticky/position/order (зняти конфлікти)

- Якщо на батьківському контейнері є order/sticky/top, які тягнуть аналітику вгору — прибери для блока графіків.
- Переконайся, що у головних секціях немає z‑index/absolute, які витісняють наступні блоки.

Крок 4 — Відокремити стилі аналітики

- Додай модульний клас для секції аналітики, наприклад hr-analytics:
    - display: grid; grid-template-columns: repeat(12, 1fr);
    - gap: 24px;
    - .chart-card: grid-column: span 12; @media (min-width:1024px) span 6; @media (min-width:1280px) span 4;
- Не підмішуй стилі контейнерів календаря/таблиці.

Крок 5 — DIFF‑шаблон (пристосуй до ваших файлів)

1) HRPanel.tsx (упорядкувати секції та додати сітку)
--- a/src/pages/HRPanel.tsx
+++b/src/pages/HRPanel.tsx
@@ -20,18 +20,39 @@
export default function HRPanel() {

  - return (
  - <Page>
  -      <Header />
      -      <HRAnalytics />      {/* РАНІШЕ: стояв над головними даними — неправильно */}
      -      <Filters />
      -      <CalendarAndList />
      -      <EmployeesTable />
      - </Page>
  - );
  + return (
  + <Page>
  +      <Header />
      +      <Filters />
      +      <CalendarAndList />
      +      <EmployeesTable />
      +      {/* Графіки тільки нижче головних даних */}
      +      <section aria-label="HR Analytics" className="hr-analytics mt-8">
      +        <HRAnalytics />
      +      </section>
      + </Page>
  + );
}

2) HRAnalytics.tsx (грид і карточки)
--- a/src/components/HRAnalytics.tsx
+++b/src/components/HRAnalytics.tsx
@@ -1,10 +1,36 @@
export default function HRAnalytics() {
    - return (
    - <div>
    -      <KPI />
        -      <Trend />
        -      <StatusStacked />
        -      <Distribution />
        -      <Heatmap />
        -      <Top10 />
        - </div>
    - );
    + return (
    + <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">

```
+      <div className="chart-card min-h-[280px]"><KPI /></div>
```

```
+      <div className="chart-card min-h-[320px]"><Trend /></div>
```

```
+      <div className="chart-card min-h-[320px]"><StatusStacked /></div>
```

```
+      <div className="chart-card min-h-[320px]"><Distribution /></div>
```

```
+      <div className="chart-card min-h-[320px]"><Heatmap /></div>
```

```
+      <div className="chart-card min-h-[320px]"><Top10 /></div>
```

    + </div>
    + );
}

3) styles (за потреби)
--- a/src/styles/analytics.css
+++b/src/styles/analytics.css
@@ -1,12 +1,28 @@
.hr-analytics { margin-top: 1.5rem; }
.chart-card {
background: var(--card-bg, \#fff);
border: 1px solid var(--card-border, \#e5e7eb);
border-radius: 12px;
padding: 16px;
min-height: 280px;
display: flex;
flex-direction: column;
}
+/* Грід на CSS (якщо без Tailwind) */
+.hr-analytics {
      + display: grid;
      + grid-template-columns: repeat(1, minmax(0, 1fr));
      + gap: 24px;
+}
+@media (min-width: 1024px) {
      + .hr-analytics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
+}
+@media (min-width: 1280px) {
      + .hr-analytics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
+}

Крок 6 — Перевірка
      - HR: графіки нижче календаря/таблиць, у 3/2/1‑колонному гріді; таблиці/календар не рухаються, поведінка фільтрів не змінена.
      - Manager/My View: без графіків, вигляд не змінився.
      - Вікна 1440/1280





