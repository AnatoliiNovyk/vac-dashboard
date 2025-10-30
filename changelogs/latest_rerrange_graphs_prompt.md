Промпт: Вирівняй графіки горизонтально під основним контентом “HR View”

Важливо

- Суворо дотримуйся системного промпта (3 статуси; без “заявок/затверджень”; ролі/вкладки; права HR; нічого не видаляти; changelog після кожного кроку).
- Створи новий changelog у changelogs/ з DIFF та скрінами “до/після”.
- Працюй тільки з “HR View”. Manager/My View не змінювати.

Що саме виправити (точково)

1) index.html (або відповідний HR‑layout)

- Переконайся, що блок аналітики розташований ПІД основним контентом (фільтри → календар/список періодів → таблиці → аналітика).
- Обов’язково обгорни графіки у контейнер із класом analytics-grid (новий або замінити поточний контейнер, який зараз формує вертикальний стек).

Приклад (адаптуй до твоєї розмітки):

<section id="analytics-section" class="analytics-section">
  <div class="analytics-grid">
    ```
    <div class="chart-card" id="kpi-card"></div>
    ```
    ```
    <div class="chart-card" id="status-donut"></div>
    ```
    ```
    <div class="chart-card" id="dept-usage"></div>
    ```
    ```
    <div class="chart-card" id="top5-most"></div>
    ```
    ```
    <div class="chart-card" id="top5-least"></div>
    ```
  </div>
</section>
2) style.css

- Заборони вертикальну колонку для блоку аналітики. Будь-які правила типу .analytics-section { display:flex; flex-direction:column; } потрібно або прибрати, або перекрити новим грідом.
- Додай/заміни стилі на грід із 3/2/1 колонкою (desktop/tablet/mobile). KPI (якщо потрібно) може спанити 2–3 колонки, але інші — по одній.

Додай/заміни:
.analytics-section { margin-top: 24px; }
.analytics-grid {
display: grid;
grid-template-columns: 1fr;
gap: 24px;
}
@media (min-width: 1024px) {
.analytics-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1280px) {
.analytics-grid { grid-template-columns: repeat(3, 1fr); }
}
/* Карточки графіків */
.chart-card {
background: \#fff;
border: 1px solid \#E5E7EB;
border-radius: 12px;
min-height: 320px;
padding: 16px;
display: flex;
flex-direction: column;
}
/* Якщо KPI має бути широкий — зніми або залиш як опцію */
.chart-card.kpi-wide {
grid-column: span 3;
}
@media (min-width: 1024px) {
.chart-card.kpi-wide { grid-column: span 2; }
}
@media (min-width: 1280px) {
.chart-card.kpi-wide { grid-column: span 3; }
}

/* Заборонити стилі, що ламають грід у батьків */
\#analytics-section, .analytics-section, .analytics-grid {
position: static;
order: initial;
}

/* Не дозволяти vertical stack з глобальних flex-контейнерів */
.analytics-section .vertical-stack,
.analytics-grid .vertical-stack {
display: contents; /* або прибрати клас vertical-stack у HTML/JS */
}

3) app.js

- Не монтуй графіки безпосередньо у root‑контейнер вертикально. Завжди монтуй у .chart-card відповідних елементів всередині .analytics-grid.
- Якщо створюєш елементи графіків у JS — переконайся, що їхній parentNode = .chart-card (а не загальний блок).
- Заборони додавання класів, що нав’язують flex‑column у контейнері аналітики (видалити/не додавати .flex, .flex-col, .stack тощо).

Приклад фіксу (псевдокод):
// BEFORE (погано): append у один контейнер по черзі
const root = document.getElementById('analytics-section');
root.appendChild(buildKPI());
root.appendChild(buildDonut());
// ...

// AFTER (добре): таргетимо окремі chart-card
mountKPI(document.getElementById('kpi-card'));
mountStatusDonut(document.getElementById('status-donut'));
mountDeptUsage(document.getElementById('dept-usage'));
mountTop5Most(document.getElementById('top5-most'));
mountTop5Least(document.getElementById('top5-least'));

- Переконайся, що жоден глобальний контейнер над analytics-section не має display:flex з flex-direction:column, який “пересилює” грід. Якщо є — обгорни аналітику в .analytics-grid як окремий grid‑контекст (вже зробили вище).
- Переконайся, що немає обмежувальних width/overflow/height на батьківських контейнерах, що змушують картки тягнутись на всю ширину і падати в стовпець. Якщо є — явно задаj width:100% у .chart-card і нехай грід керує ширинами.

Контрольні перевірки (на тих самих сторінках, що на скрінах)

- “HR View”: графіки СТРОГО під основним контентом, у 3/2/1 колонках (роздільні картки).
- Немає вертикального “стікування” на ≥1280px.
- Консоль без помилок/висотних/overflow попереджень; ререндер стабільний.
- Manager/My View без графіків; їхній UI не змінено.

Changelog (обов’язково)

- Назва: “Fix: горизонтальне розміщення блоку аналітики у HR View”.
- Додай DIFF по style.css, index.html, app.js (рядки/селектори/ID).
- Додай 3 скріни: desktop (≥1440px), tablet (1024–1279px), mobile (<1024px).
- Rollback: як повернути попередні стилі/контейнери (посилання на попередній коміт).

Примітка

- У твоєму поточному стилі явно присутній вертикальний стек (див. скріни): або через клас типу flex-col у контейнері, або через відсутність реального grid‑контейнера для карток. Навіть якщо “grid” вже додано до .analytics-section, але усі графіки монтуються в ОДИН внутрішній блок, вони виглядатимуть вертикально. Обов’язково додай .analytics-grid і окремі .chart-card для кожного графіка та монтуй їх саме в ці chart-card. Це гарантує горизонтальну розкладку на десктопі.
