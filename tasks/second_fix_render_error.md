Промпт: Зупинити безперервний ререндер (друга ітерація, поглиблена)

Контекст

- Після попереднього фіксу нескінченний ререндер не зупинився. Проблема в HR‑вкладці (HRAnalytics або пов’язані селектори/контексти). Менеджер/My View теж під ризиком, якщо спільні провайдери.

Ціль

- Виявити й усунути всі тригери повторного ререндеру: нестабільні пропси/функції/об’єкти, неправильні залежності хуків, контекстні value, хуки даних із циклічним setState, використання Date/Math/random у залежностях, сторонні таймери/події без cleanup.

Етап А — Точна діагностика (без коду)

1) Включи React Profiler і визнач компонент(и) з найвищою частотою рендерів: HRAnalytics, FiltersProvider, DataSelectors, Tabs, Table.
2) Додай тимчасові логи (console.count) у підозрілих місцях:
    - верхи компонентів,
    - useEffect та їх cleanup,
    - провайдери контекстів (value).
3) В changelog запиши дерево, де відбувається каскад.

Етап B — Жорстка стабілізація джерел нестабільності

1) Контексти
    - Якщо <FiltersContext.Provider value={{ filters, setFilters }}> створює нові посилання на кожен рендер — мемоізуй:
const value = useMemo(() => ({ filters, setFilters }), [filters, setFilters]);
    - Якщо filters збирається як об’єкт inline у батьківському — мемоізуй його створення (useMemo) або декомпозуй до примітивів у залежностях.
2) Селектори/агрегації
    - Будь‑який selector, що повертає новий масив/об’єкт — обгорни в useMemo з точними залежностями [rawData, filterPrimitives].
    - Заборонити setState у селекторах та під час render‑шляху.
3) Ефекти
    - Вилучи нестабільні залежності: new Date(), Math.random(), нові функції/масиви/об’єкти.
    - Якщо потрібна “сьогоднішня” дата — const today = useRef(startOfToday()).current (або useMemo(() => startOfToday(), [])).
    - Усі addEventListener / setInterval / requestAnimationFrame — мають мати cleanup у return () => … і не оновлювати state без умов.
4) Функції‑пропси для графіків
    - Усі колбеки подій (onClick, onZoom, onBrush) — через useCallback з порожніми або мін‑залежностями.
    - Заборонити inline data.map(…) прямо у JSX: винести в useMemo.
5) Перевір serializable state
    - Якщо setFilters(prev => ({...prev, x})) викликається з масивом залежностей, який у свою чергу змінюється від цього setFilters — утворюється цикл. Розірви ланцюг: debounce або окремий локальний state без зворотного зв’язку в effect.
6) Guard монтування HRAnalytics
    - Рендер HRAnalytics тільки коли activeTab === 'HR'.
    - Якщо HRAnalytics залежить від “activeRole/filters”, які змінюються під час mount → відклади рендер до стабілізації (наприклад, render після першого тикета useEffect(() => setReady(true), [])).

Етап C — Типові приховані джерела, які слід виправити

1) Memo ключів контейнерів
    - Заборонено міняти key у контейнера вкладки при кожній зміні фільтра — це змушує remount дерева.
2) Вирівнювання провайдерів
    - Провайдери не повинні огортати усю сторінку, якщо оновлюються часто — звузити область.
3) ErrorBoundary loops
    - Якщо в ErrorBoundary fallback викликає зміну state/route — формується цикл. Заборонити side‑effects у fallback.
4) Chart lib re-init
    - Якщо інстанс графіка створюється кожен рендер через імперативний init без перевірки — загорни в useEffect з cleanup і стабільними deps (дані/size), або використай обгортку бібліотеки для React.

Етап D — DIFF‑патерни (застосуй вибірково)

1) Стабілізація today/filters:
const todayRef = useRef(startOfToday());
const today = todayRef.current;
const filterPrimitives = useMemo(
() => ({ depId: filters.depId, from: filters.from, to: filters.to, type: filters.type }),
[filters.depId, filters.from, filters.to, filters.type]
);
2) Мемо‑серії для графіка:
const series = useMemo(() => buildSeries(rawData, filterPrimitives, today), [rawData, filterPrimitives, today]);
3) Callback без циклу:
const handlePointClick = useCallback((p) => {
setFilters((prev) => (prev.day === p.x ? prev : { ...prev, day: p.x }));
}, []);
4) Context value:
const ctxValue = useMemo(() => ({ filters, setFilters }), [filters, setFilters]);
<FiltersContext.Provider value={ctxValue}>
5) Cleanup імперативного графіка:
useEffect(() => {
const chart = initChart(containerRef.current, options);
chart.setData(series);
return () => chart.destroy();
}, [series]); // не включай нові об’єкти options; мемоізуй їх

Етап E — Верифікація

- React Profiler: один рендер після зміни фільтра/розміру; відсутні каскади.
- Консоль: немає “Too many re-renders” і нескінченних логів.
- HR — графіки + таблиці; Manager/My View — без графіків; вкладки працюють.

Changelog (обов’язково)

- Запиши усі знайдені цикли (компонент/хук/рядок), застосовані DIFF, скріни Profiler до/після, і rollback‑план.

Якщо потрібно — надішліть уривки проблемних компонентів (HRAnalytics, провайдери фільтрів, селектори, ініціалізація графіка), і підготую точковий DIFF з конкретними рядками.

