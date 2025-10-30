Промпт: Stop-the-loop — локалізація та повний фікс нескінченного ререндеру

Мета

- Визначити конкретний тригер циклу та усунути його за один крок.
- Підтвердити стабільність через React Profiler (1 рендер/зміну фільтра), і додати changelog з root‑cause.

Чіткі дії (виконай по порядку, не пропускай)

1) Виміряй і зафіксуй джерело

- Увімкни React Profiler на HR‑вкладці. Зроби “Record” → зміни будь‑який фільтр → “Stop”. Збережи скрін з “flame chart”/“ranked”.
- Додай тимчасові логи у верхи ПІДОЗРІЛИХ компонентів/хуків (тільки тут, не всюди):
    - HRAnalytics.tsx
    - провайдер фільтрів/даних (FiltersProvider/DataProvider)
    - селектори/адаптери (особливо, що повертають нові масиви/об’єкти)
    - ініціалізація графіка (useEffect з init/destroy)
- console.count('HRAnalytics render'), console.count('FiltersProvider render'), тощо.
- У changelog зафіксуй, що конкретно рендериться 10+ разів підряд.

2) Відсічи топ‑3 типові корені (застосуй усі три)
A) Контекстне value

- Якщо є <FiltersContext.Provider value={{ filters, setFilters }}> — заміни:
const ctxValue = useMemo(() => ({ filters, setFilters }), [filters, setFilters]);
<FiltersContext.Provider value={ctxValue}>
- Якщо filters формується з об’єкта, що збирається inline у батьківського — мемоізуй конструкцію:
const filterPrimitives = useMemo(() => ({
depId: filters.depId, from: filters.from, to: filters.to, type: filters.type
}), [filters.depId, filters.from, filters.to, filters.type]);
— і далі використовуй filterPrimitives у залежностях.

B) Селектори/агрегації

- Будь‑який selector, що повертає новий масив/об’єкт — у useMemo:
const series = useMemo(() => buildSeries(rawData, filterPrimitives, today), [rawData, filterPrimitives, today]);
- Заборонено setState усередині селекторових функцій або під час самого рендеру.

C) Нестабільні залежності (Date/Math/inline об’єкти/функції)

- Стабілізуй “сьогодні”:
const today = useRef(startOfToday()).current; // або useMemo([], [])
- Усі onClick/onBrush — тільки useCallback з мін‑залежностями.
- Заборони inline масиви/об’єкти в пропсах графіка — через useMemo.

3) Прибери таймери/події без cleanup і цикли в ефектах

- Усі addEventListener / setInterval / requestAnimationFrame — тільки в useEffect з return cleanup і стабільними deps.
- Заборони в ефектах “setState” без захисту умовами:
useEffect(() => {
if (!ready) setReady(true); // виконається 1 раз; але краще setReady у пустому effect
}, [ready]);

4) Перевір ключі, що перемонтовують дерева

- Заборонено міняти key у контейнера вкладок/графіків при кожній зміні filters — це створює remount → нові ефекти → цикл.
- Зафіксуй статичний key або обчислюй його лише від стабільного ідентифікатора.

5) Імперативні графіки (якщо init/destroy)

- Загорни ініціалізацію в ефект з чистим cleanup і стабільними deps:
useEffect(() => {
const chart = initChart(ref.current, optionsMemo); // optionsMemo = useMemo(...)
chart.setData(series);
return () => chart.destroy();
}, [series, optionsMemo]);
- Не включай у залежності “options” як новий об’єкт — мемоізуй:
const optionsMemo = useMemo(() => ({ ...BASE_OPTIONS, legend: showLegend }), [showLegend]);

6) Захист від “feedback” циклів у фільтрах

- Якщо onPointClick оновлює filters і цим же перераховуються series, які перезаписують filters назад — розірви цикл умовою:
const onPointClick = useCallback((p) => {
setFilters(prev => (prev.day === p.x ? prev : { ...prev, day: p.x }));
}, []);
- Або додай debounce (useRef таймера) для апдейту filters з графіка.

7) Підтвердження стабільності

- Повтори профілювання: очікуємо 1–2 ререндери на зміну фільтра.
- Перевір HR: вкладки+таблиці на місці, графіки реагують лише на реальні зміни.
- Перевір Manager/My View: графіків немає, ререндер нормальний.
- Занеси DIFF‑фрагменти та скріни профайлера в changelog.

Швидкі DIFF‑шаблони (вставити адресно)

- Context value:
// BEFORE
<FiltersContext.Provider value={{ filters, setFilters }}>
// AFTER
const ctxValue = useMemo(() => ({ filters, setFilters }), [filters, setFilters]);
<FiltersContext.Provider value={ctxValue}>
- Stabilize “today”:
const today = useRef(startOfToday()).current;
- Series memo:
const series = useMemo(() => buildSeries(rawData, filterPrimitives, today), [rawData, filterPrimitives, today]);
- Callbacks:
const handleBarClick = useCallback((x) => {
setFilters(prev => (prev.bar === x ? prev : { ...prev, bar: x }));
}, []);
- Effect cleanup (chart):
useEffect(() => {
if (!ref.current) return;
const chart = initChart(ref.current, optionsMemo);
chart.setData(series);
return () => chart.destroy();
}, [series, optionsMemo]);
- Guard mount HR only:
if (activeTab !== 'HR') return null;

Що очікую у відповіді агента

- Профайлер скрін до/після + назва конкретного компонента‑винуватця.
- Точкові DIFF по файлах (рядки).
- Пояснення root‑cause (наприклад: “context value створювався щоразу”, “inline Date в deps”, “chart init без memo options”).
- Новий changelog у changelogs/ з rollback‑планом.

Якщо скинеш 2–3 ключові файли (HRAnalytics.tsx, FiltersProvider, основний селектор для серій) — складу адресний DIFF з рядками, щоб добити цикл гарантовано.

