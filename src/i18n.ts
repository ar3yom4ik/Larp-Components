import { useSyncExternalStore } from "react";

export type Language = "en" | "ru";
let language: Language = "en";
try { language = localStorage.getItem("larp-language") === "ru" ? "ru" : "en"; } catch { /* Optional browser storage. */ }
const listeners = new Set<() => void>();
export function setLanguage(value: Language) {
  language = value;
  try { localStorage.setItem("larp-language", value); } catch { /* Optional browser storage. */ }
  document.documentElement.lang = value;
  listeners.forEach((fn) => fn());
}
export const getLanguage = () => language;
export function useLanguage() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getLanguage, getLanguage);
}

// Program identifiers, code and user-authored names remain unchanged in both languages.
export const RU: Record<string, string> = {
  "Automatic pickup sensor": "Автоматический датчик захвата",
  "Beam range (m)": "Длина луча (м)",
  "Detection radius (m)": "Радиус обнаружения (м)",
  "Auto-fit beam to conveyor": "Подстроить луч под ширину конвейера",
  "Initial signal": "Начальный сигнал",
  "Active duration (s)": "Длительность сигнала (с)",
  "Signal I/O": "Сигнальные входы и выходы",
  "Signal function": "Функция сигнала",
  "Output colour": "Цвет выхода",
  "Use component wire colour": "Использовать цвет провода компонента",
  "Each numbered pair has its own function and output colour. A new pair appears when a port is connected.": "Каждая пара имеет свою функцию и цвет выхода. При подключении появляется новая пара.",
  "Enable → detected": "Разрешение → обнаружено",
  "Enable → clear": "Разрешение → свободно",
  "Enable → pressed": "Разрешение → нажато",
  "Enable → busy": "Разрешение → занята",
  "Enable → ready": "Разрешение → готова",
  "Enable → working": "Разрешение → работает",
  "Enable → completed": "Разрешение → завершено",
  "Enable → full": "Разрешение → заполнен",
  "Enable → available": "Разрешение → есть место",
  "Start → operation end": "Пуск → конец операции",
  "Start → moving": "Пуск → движение",
  "Feed → part released": "Подача → деталь выпущена",
  "Run → running": "Пуск → работает",
  "Run → stopped": "Пуск → остановлен",
  "Relay input": "Передать вход",
  "Invert input": "Инвертировать вход",
  "GI benchmark scene": "Сцена проверки глобального освещения",
  "Cornell benchmark room": "Тестовая комната Корнелла",
  "Temporarily replaces the factory with a Cornell room for comparing global illumination. Turn it off to return to your factory and previous camera.": "Временно заменяет фабрику комнатой Корнелла для сравнения глобального освещения. Выключите, чтобы вернуться к фабрике и прежнему положению камеры.",
  "Collision shape": "Форма коллайдера",
  "Accurate (compound)": "Точная (составная)",
  "Box (fast)": "Коробка (быстро)",
  "Accurate": "Точная",
  "Box": "Коробка",
  "Shared physics mode": "Общий режим физики",
  "Shared collision shape": "Общая форма коллайдера",
  "Shared mass (kg)": "Общая масса (кг)",
  "Mass (kg)": "Масса (кг)",
  "Conveyor settings": "Настройки конвейера",
  "Conveyor type": "Тип конвейера",
  "Belt conveyor": "Ленточный конвейер",
  "Roller conveyor": "Роликовый конвейер",
  "Width (m)": "Ширина (м)",
  "Speed (m/s)": "Скорость (м/с)",
  "Negative speed reverses the belt. A connected signal controls running; disconnect it to use the manual setting.": "Отрицательная скорость меняет направление. Подключённый сигнал управляет движением; отключите сигнал для ручного управления.",
  "Keep full pallet and wait": "Оставлять полный поддон и ждать замены",
  "Clear / replace pallet": "Очистить / заменить поддон",
  "Loaded": "Загружено",
  "Initially active": "Активна изначально",
  "Active duration (seconds)": "Длительность активности (секунды)",
  "Zero toggles on each click. A positive duration sends a timed pulse; clicking again restarts it. Reset restores the initial state.": "Ноль переключает состояние при каждом нажатии. Положительная длительность создаёт импульс; повторное нажатие запускает его заново. Сброс восстанавливает начальное состояние.",
  "Attach to conveyor": "Прикрепить к конвейеру",
  "Free standing": "Отдельный датчик",
  "Position along conveyor": "Положение вдоль конвейера",
  "Pickup sensor": "Датчик захвата",
  "laser": "лазер",
  "proximity": "датчик приближения",
  "none": "нет",
  "Fullscreen catalog": "Каталог на весь экран",
  "Exit fullscreen catalog": "Закрыть полноэкранный каталог",
  "Edit catalog model": "Редактировать модель каталога",
  "Changes apply to every instance of this imported asset.": "Изменения применяются ко всем экземплярам импортированной модели.",
  "Add imported model": "Добавить импортированную модель",
  "Submodels": "Части модели",
  "Remove unwanted meshes from all instances. Restore them at any time.": "Удалите ненужные сетки из всех экземпляров. Их можно восстановить в любой момент.",
  "Keep at least one submodel.": "Оставьте хотя бы одну часть модели.",
  "Restore submodel": "Восстановить часть модели",
  "Remove submodel": "Удалить часть модели",
  "Restore": "Восстановить",
  "Layout context menu": "Контекстное меню сцены",
  "Fit layout": "Показать сцену целиком",
  "Unlock": "Разблокировать",
  "Show": "Показать",
  "Hide": "Скрыть",
  "More free model sources — browse and download on the provider, then use Import 3D model. Check each model's licence and attribution.": "Другие бесплатные модели: скачайте модель на сайте источника и выберите «Импорт 3D-модели». Проверьте лицензию и указание авторства.",
  "Direct provider APIs may require an account or API key; no credentials are stored here.": "API источников могут требовать учётную запись или ключ; здесь учётные данные не сохраняются.",
  "Factory node canvas": "Граф узлов фабрики", "Fit all nodes": "Показать все узлы", "Node actions": "Действия с узлами",
  "Group": "Группа", "Group name": "Название группы", "Group color": "Цвет группы", "Group selected nodes": "Сгруппировать выбранные узлы", "Ungroup": "Разгруппировать", "Rearrange nodes": "Упорядочить узлы", "nodes selected": "узлов выбрано", "selected": "выбрано",
  "Drag the frame to move its members. Copy and paste to duplicate the group.": "Перетащите рамку, чтобы переместить узлы. Копирование и вставка дублируют всю группу.",
  "Drag a selected node to move the selection. Right-click for more actions.": "Перетащите выбранный узел, чтобы переместить все выбранные. Щёлкните правой кнопкой для дополнительных действий.",
  "drag to select · middle mouse or Space + drag to pan · wheel to zoom": "перетащите для выделения · средняя кнопка или пробел и перетаскивание для перемещения · колесо для масштаба",
  "Connect multiple feeders, robots, operators or conveyors here. Inlets are created automatically.": "Подключите несколько податчиков, роботов, операторов или конвейеров. Входные линии создаются автоматически.",
  "A physical conveyor segment. Connect multiple material sources to its input to merge production lines automatically.": "Физический участок конвейера. Подключите к входу несколько источников для автоматического объединения линий.",
  "Physics": "Физика", "Physics mode": "Режим физики", "Kinematic": "Кинематический", "Kinematic (legacy)": "Кинематический (старый режим)", "Dynamic": "Динамический", "Weight (kg)": "Масса (кг)",
  "Dynamic components fall and collide during simulation. Kinematic components stay at their edited pose. Choose a mode to enable physics for legacy components. Reset restores the layout; colliders are simplified.": "Динамические компоненты падают и сталкиваются во время симуляции. Кинематические остаются в заданном положении. Выберите режим, чтобы включить физику для старых компонентов. Сброс возвращает исходную сцену; коллайдеры упрощены.",
  "Elevated Platform": "Высокая платформа", "Industrial Stairs": "Промышленная лестница", "Deck": "Настил", "Access": "Доступ", "Adjustable": "Регулируется", "Multi-level": "Несколько уровней",
  "Raised factory floor with adjustable dimensions and structural legs.": "Приподнятый заводской пол с регулируемыми размерами и опорными стойками.",
  "Adjustable stepped access between a lower level and an elevated platform.": "Регулируемая лестница между нижним уровнем и высокой платформой.",
  "Patrol waypoints": "Точки маршрута", "Waypoint": "Точка маршрута", "Remove waypoint": "Удалить точку маршрута", "Add waypoint": "Добавить точку маршрута", "Use automatic heights": "Автоматическая высота",
  "Waypoint Y is relative to the worker's starting height. Stairs connect floors automatically.": "Высота Y задаётся относительно начальной высоты работника. Лестницы автоматически соединяют этажи.",
  "The workpiece is saved independently of its scene model.": "Заготовка сохраняется отдельно от модели на сцене.", "Remove saved workpiece": "Удалить сохранённое изделие", "Saved workpiece removed": "Сохранённое изделие удалено", "Remove this saved workpiece? Components using it will switch to cartons. Existing products may need a simulation reset. You can undo this action.": "Удалить сохранённое изделие? Использующие его компоненты переключатся на картонные коробки. Для уже созданных изделий может потребоваться сброс симуляции. Это действие можно отменить.",

  "Imported models": "Импортированные модели",
  "Point height (local Y)": "Высота точки (локальная ось Y)",
  "Drag the handles to bend the belt. Select a point and use the move gizmo or Y field to change its height. Reverse flow swaps the entry and exit.": "Перетаскивайте маркеры, чтобы изогнуть ленту. Выберите точку и измените её высоту манипулятором перемещения или в поле Y. Разворот потока меняет вход и выход местами.",
  "Robot output": "Выход робота", "Moving or holding": "Движение или удержание", "Pulse on operation end": "Импульс после операции", "Pending robot signals": "Сигналы робота в очереди",
  "A connected IN queues one activation per visual-program pick. Operation-end OUT pulses after each successful place.": "Подключённый вход ставит в очередь одно срабатывание на каждый захват визуальной программы. Выход выдаёт импульс после каждого успешного размещения.",
  "Drag OUT to IN. Drag a connected IN away to disconnect or reroute; for a shared IN, select its source first. You can also click ports. Material flow is separate.": "Перетащите выход на вход. Перетащите подключённый вход в сторону для отключения или на другой вход для перенаправления; при нескольких источниках сначала выберите нужный выход. Порты также можно нажимать. Поток изделий настраивается отдельно.",
  "Signal wire preview": "Предпросмотр сигнального провода",
  "Merge layout": "Тип объединения", "Multi-head junction": "Несколько входов", "Side entry to main conveyor": "Боковой вход на основной конвейер", "Used when two or more conveyors feed this conveyor.": "Используется при подключении двух и более конвейеров.",
  "Connect multiple conveyor outputs here to merge lines.": "Подключите сюда выходы нескольких конвейеров, чтобы объединить линии.",
  "The workspace could not start": "Не удалось запустить рабочую среду", "Reload workspace": "Перезагрузить рабочую среду", "Reload the page or try the downloadable standalone HTML in a current browser. Your saved projects have not been cleared.": "Перезагрузите страницу или откройте загруженный HTML-файл в современном браузере. Сохранённые проекты не удалены.",
  "3D viewport unavailable": "3D-вид недоступен", "Retry 3D viewport": "Повторить запуск 3D-вида", "The browser could not start the 3D renderer. Check that WebGL and hardware acceleration are enabled, or try another browser. The rest of the workspace remains available.": "Браузеру не удалось запустить 3D-рендерер. Проверьте, включены ли WebGL и аппаратное ускорение, или попробуйте другой браузер. Остальные элементы интерфейса доступны.",
  "Add another signal target": "Добавить ещё одно назначение сигнала", "Choose a target": "Выберите назначение", "Connected targets": "Подключённые устройства", "Remove connection": "Удалить соединение", "Choose multiple targets; click a connected IN port to disconnect it. Signal links only; material flow is separate.": "Можно выбрать несколько назначений; нажмите подключённый вход, чтобы отключить его. Здесь подключаются только сигналы; поток изделий настраивается отдельно.",
  "Reset window size": "Сбросить размер окна", "Window size reset": "Размер окна сброшен", "Drag the title bar to move the window and the bottom corner to resize it. Double-click the title bar to re-centre. Size, position and dimming are remembered.": "Перетаскивайте заголовок, чтобы переместить окно, и нижний угол, чтобы изменить размер. Двойной щелчок по заголовку возвращает окно в центр. Размер, положение и затемнение сохраняются.",
  "Drag or use arrow keys to resize": "Перетащите или используйте стрелки для изменения размера",
  "Wire colour": "Цвет провода", "Feeder control": "Управление податчиком", "Signal-controlled": "По сигналу", "Signal sources": "Источники сигнала", "Pending": "В очереди",
  "One part per signal activation. Requests wait if the output is blocked or supply is empty; the spawn interval sets the minimum spacing.": "Одно изделие на каждое срабатывание. Запросы ждут, пока выход не освободится или запасы не пополнятся; интервал подачи задаёт минимальное время между изделиями.",
  "Runs automatically. Connect a button, sensor, laser or PLC to produce one part per signal activation.": "Работает автоматически. Подключите кнопку, датчик, лазер или ПЛК, чтобы подавать одно изделие на каждое срабатывание.",
  "Edit signal connections": "Редактировать сигнальные соединения", "Signal output": "Выход сигнала", "Signal input": "Вход сигнала", "Disconnect signal": "Отключить сигнал", "Choose an IN port for": "Выберите вход для", "Choose an OUT port on a sensor, button, laser, PLC or robot.": "Выберите выход датчика, кнопки, лазера, ПЛК или робота.", "Signal links only; material flow is separate.": "Только сигналы; поток изделий подключается отдельно.",
  "Export copy (.lcmx)": "Экспорт копии (.lcmx)", "Import project (.lcmx / .txt / .json)": "Импорт проекта (.lcmx / .txt / .json)",
  "Video": "Видео", "Graphics quality": "Качество графики", "Lighting": "Освещение",
  "Interface & colours": "Интерфейс и цвета", "Keybinds": "Горячие клавиши", "Settings backup": "Резервная копия настроек",
  "Import 3D model": "Импорт 3D-модели",
  "Import model": "Импорт модели",
  "3D assets": "3D-объекты",
  "Add local models and edit their materials in your factory.": "Добавляйте локальные модели и редактируйте их материалы.",
  "Choose model + companion files": "Выбрать модель и сопутствующие файлы",
  "or drop files here · ZIP supported": "или перетащите файлы сюда · поддерживается ZIP",
  "Choose model files": "Выбрать файлы модели",
  "Model to import": "Модель для импорта",
  "Several models were found. Choose one; import again to add another.": "Найдено несколько моделей. Выберите одну; затем повторите импорт.",
  "Reading and preparing model…": "Чтение и подготовка модели…",
  "Supported": "Поддерживается",
  "For glTF, OBJ, FBX or DAE, select the model together with its textures, .bin and .mtl files. Use a ZIP to preserve folders.": "Для glTF, OBJ, FBX и DAE выберите модель вместе с текстурами и файлами .bin и .mtl. Для сохранения папок используйте ZIP.",
  "Files stay on this device. External model URLs are blocked. Up to 80 MB and 1,000 files per import.": "Файлы остаются на этом устройстве. Внешние ссылки заблокированы. До 80 МБ и 1000 файлов за импорт.",
  "Release to place component or import files": "Отпустите, чтобы разместить компонент или импортировать файлы",
  "Imported model": "Импортированная модель",
  "Imported model settings": "Настройки импортированной модели",
  "Model units": "Единицы модели",
  "Auto (large models → mm)": "Авто (крупные модели → мм)",
  "Meters": "Метры",
  "Millimeters": "Миллиметры",
  "Centimeters": "Сантиметры",
  "Inches": "Дюймы",
  "Feet": "Футы",
  "Up axis": "Вертикальная ось",
  "meshes": "сеток",
  "triangles": "треугольников",
  "embedded files": "встроенных файлов",
  "Imported models can be workpieces with mesh-derived compound colliders; they do not automatically become machines or detailed navigation obstacles.": "Импортированные модели можно использовать как изделия с составными коллайдерами по геометрии; они не превращаются автоматически в станки или детальные препятствия для навигации.",
  "Materials & textures": "Материалы и текстуры",
  "Materials and textures": "Материалы и текстуры",
  "Restore source material": "Восстановить исходный материал",
  "Material": "Материал",
  "Base color": "Основной цвет",
  "Emissive color": "Цвет свечения",
  "Roughness": "Шероховатость",
  "Metalness": "Металличность",
  "Opacity": "Непрозрачность",
  "Emissive intensity": "Интенсивность свечения",
  "Double-sided": "Двусторонний материал",
  "Select a texture to replace a source map. Roughness uses green, metalness uses blue, and AO uses red (standard glTF/PBR packing). Models need UV coordinates.": "Выберите текстуру для замены карты. Шероховатость использует зелёный канал, металличность — синий, AO — красный (стандарт glTF/PBR). Нужна UV-развёртка.",
  "Base color map": "Карта цвета",
  "Normal map": "Карта нормалей",
  "Roughness map": "Карта шероховатости",
  "Metalness map": "Карта металличности",
  "Ambient occlusion map": "Карта затенения AO",
  "Emissive map": "Карта свечения",
  "Opacity map": "Карта прозрачности",
  "Bump map": "Карта рельефа",
  "Displacement map": "Карта смещения",
  "Removed": "Удалена",
  "Choose texture": "Выбрать текстуру",
  "Restore source map": "Восстановить исходную карту",
  "Remove map": "Удалить карту",
  "Continue without restoring or autosave — export a copy": "Продолжить без восстановления и автосохранения — экспортируйте копию",

  "Project would exceed the 180 MB limit. Remove assets or start a new project.": "Проект превысит ограничение 180 МБ. Удалите ресурсы или создайте новый проект.",
  "Keep feet near floor": "Удерживать ноги у пола",
  "Animated worker settings": "Настройки анимированного работника",
  "Animated worker": "Анимированный работник",
  "Character appearance": "Внешность персонажа",
  "Built-in rigged worker": "Встроенный персонаж со скелетом",
  "Classic mannequin": "Классический манекен",
  "Custom character": "Свой персонаж",
  "Import rigged character": "Импортировать персонажа со скелетом",
  "Height (m)": "Рост (м)",
  "Worker height": "Рост работника",
  "Model forward": "Направление модели",
  "The built-in worker has a Mixamo-compatible humanoid rig. Choose an imported skinned character, or import one directly. Appearance is copied into this worker.": "Встроенный персонаж использует совместимый с Mixamo скелет. Выберите импортированного персонажа или импортируйте его прямо сюда. Внешность копируется в работника.",
  "Animation clips": "Клипы анимации",
  "Idle, walk and work crossfade automatically. Optional: import Mixamo FBX clips (Without Skin; use In Place for walking). Matching humanoid bones are required.": "Ожидание, ходьба и работа плавно переключаются. Можно импортировать клипы Mixamo FBX (Without Skin; для ходьбы — In Place). Нужны совместимые кости.",
  "Import animation": "Импортировать анимацию",
  "Reset animation": "Сбросить анимацию",
  "Clip": "Клип",
  "walk": "ходьба",
  "work": "работа",
  "Loading…": "Загрузка…",
  "Rigged character assigned to worker": "Персонаж со скелетом назначен работнику",
  "Restoring project…": "Восстановление проекта…",
  "Browser autosave is unavailable. Export a project copy to keep your work.": "Автосохранение в браузере недоступно. Экспортируйте копию проекта, чтобы сохранить работу.",
  "Base color map strength": "Сила: карта цвета",
  "Normal map strength": "Сила: карта нормалей",
  "Roughness map strength": "Сила: карта шероховатости",
  "Metalness map strength": "Сила: карта металличности",
  "Ambient occlusion map strength": "Сила: карта затенения ao",
  "Emissive map strength": "Сила: карта свечения",
  "Opacity map strength": "Сила: карта прозрачности",
  "Bump map strength": "Сила: карта рельефа",
  "Displacement map strength": "Сила: карта смещения",
  "Restore source map strength": "Сила: восстановить исходную карту",
  "Remove map strength": "Сила: удалить карту",
  "Larp Components": "Larp Components",
  "Local rule-based interpretation · review the recognized controls and process sequence before building. Text is also applied when you leave this field.": "Локальный разбор по правилам: перед построением проверьте параметры и последовательность операций. Текст также разбирается при выходе из поля.",
  "Staff is the total number of people across all parallel lines, not per line.": "Персонал — общее число людей на всех параллельных линиях, а не на каждой линии.",
  "Staff": "Персонал",
  "Quality inspection": "Контроль качества",
  "inspection": "контроль качества",
  "cutter": "резка",
  "Tools": "Инструменты",
  "Selected component": "Выбранный компонент",
  "Edit & arrange": "Редактирование и размещение",
  "Path editing": "Редактирование траектории",
  "Project & simulation": "Проект и симуляция",
  "View options": "Параметры вида",
  "Selection panel": "Панель выбранного",
  "Left view": "Вид слева",
  "Back view": "Вид сзади",
  "On": "вкл.",
  "Clear floor shadows and balanced lighting": "Отчётливые тени на полу и сбалансированное освещение",
  "Sharper shadows and screen-space occlusion": "Чёткие тени и экранное затенение",
  "WebGPU voxel global illumination (VXGI) with temporal anti-aliasing. Falls back to bounce lighting and GTAO on WebGL": "Глобальное освещение WebGPU (VXGI) с временным сглаживанием. Без WebGPU используется отражённое освещение и GTAO",
  "Indirect bounce light": "Отражённый свет",
  "Sun direction": "Направление солнца",
  "Sun elevation": "Высота солнца",
  "Shadow strength": "Сила теней",
  "Contact shadow strength": "Сила контактных теней",
  "Occlusion strength": "Сила затенения",
  "Occlusion radius": "Радиус затенения",
  "Fog distance": "Дальность тумана",
  "Tone mapping": "Тональная компрессия",
  "Soft shadows": "Мягкие тени",
  "Contact shadows": "Контактные тени",
  "Screen-space occlusion": "Экранное затенение",
  "Adaptive resolution": "Адаптивное разрешение",
  "Reset graphics preset": "Сбросить настройки графики",
  "Floor colour": "Цвет пола",
  "Max uses WebGPU voxel global illumination when the browser supports WebGPU, with bounce lights disabled to avoid double counting. Otherwise it uses an approximation with bounce lights and screen-space occlusion. Neither mode is path tracing, and advanced effects may be slower on mobile devices.": "Max использует глобальное освещение WebGPU (VXGI), когда браузер поддерживает WebGPU; отражённый свет при этом отключён, чтобы не считать его дважды. Иначе используется приближение с отражённым светом и экранной окклюзией. Ни один режим не является трассировкой пути; продвинутые эффекты могут работать медленнее на мобильных устройствах.",

  "FILE": "ФАЙЛ", "HOME": "ГЛАВНАЯ", "MODELING": "МОДЕЛИРОВАНИЕ", "PROGRAM": "ПРОГРАММА", "HELP": "СПРАВКА", "PROCESS": "ПРОЦЕССЫ",
  "Factory playground": "Фабричная песочница", "Auto-saved": "Сохранено", "Save": "Сохранить", "Open": "Открыть", "Close": "Закрыть", "Cancel": "Отмена", "Apply": "Применить", "Done": "Готово", "Reset": "Сбросить", "Delete": "Удалить", "Duplicate": "Копировать", "Undo": "Отменить", "Redo": "Повторить", "Copy": "Копировать", "Clear": "Очистить",
  "Clipboard": "Буфер обмена", "Manipulation": "Управление", "Grid Snap": "Привязка", "Spline": "Сплайн", "Simulation": "Симуляция", "Export": "Экспорт", "Configuration": "Конфигурация", "Reference": "Справка", "Help": "Помощь",
  "Select": "Выбрать", "Move": "Двигать", "Rotate": "Повернуть", "Select (V)": "Выбрать (V)", "Move (M)": "Двигать (M)", "Rotate (R)": "Повернуть (R)", "Snap 0.25 m": "Привязка 0,25 м", "Auto-arrange": "Упорядочить", "Play": "Запуск", "Pause": "Пауза", "Play / pause (Space)": "Запуск / пауза (Пробел)",
  "New factory": "Новая фабрика", "Browse layouts": "Готовые фабрики", "Save project": "Сохранить проект", "Export project": "Экспорт проекта", "Import project": "Импорт проекта", "Export project (.txt)": "Экспорт проекта (.txt)", "Import project (.txt / .json)": "Импорт проекта (.txt / .json)", "Copy share link": "Копировать ссылку", "Save (Ctrl+S)": "Сохранить (Ctrl+S)", "Rename project": "Переименовать проект", "Search catalog": "Поиск в каталоге", "Language": "Язык", "Interface": "Интерфейс", "Automatic": "Автоматически", "Desktop": "Компьютер", "Touch": "Сенсорный", "Russian": "Русский", "English": "Английский",
  "AI Factory": "Генератор фабрик", "Program": "Программа", "Edit program": "Редактор программы", "Edit robot program": "Редактор программы робота", "Robot program": "Программа робота", "Palletizer": "Паллетирование", "Machine tending": "Обслуживание станка", "API reference": "Справочник API", "Robot API": "API робота", "Shortcuts": "Горячие клавиши", "About": "О программе", "Procedural factory generator": "Процедурный генератор фабрик",
  "Add point": "Добавить точку", "Remove point": "Удалить точку", "Reverse flow": "Изменить направление", "Reverse": "Обратный ход", "Flip": "Развернуть", "Add": "Добавить", "Remove": "Удалить",
  "Properties": "Свойства", "Parametric": "Параметры", "Scene tree": "Дерево сцены", "Filter scene tree...": "Поиск по сцене...", "Nothing selected": "Ничего не выбрано", "Overview": "Обзор", "Transform": "Положение", "Rotation": "Поворот", "Rotation °": "Поворот °", "Scale": "Масштаб", "Lock": "Закрепить", "Locked": "Закреплено", "Visible": "Видимый", "Hidden": "Скрытый", "Show/hide": "Показать / скрыть", "Appearance": "Внешний вид", "Behaviour": "Поведение", "No parameters.": "Нет параметров.",
  "All": "Все", "Robots": "Роботы", "Conveyors": "Конвейеры", "Machines": "Станки", "Logistics": "Логистика", "Storage": "Хранение", "Safety": "Безопасность", "Building": "Здание", "Components": "Компоненты", "Layouts": "Фабрики", "eCatalog": "Каталог", "Build library": "Библиотека", "Search components...": "Поиск компонентов...", "No components found": "Компоненты не найдены", "Clear filters": "Сбросить фильтры", "Drag into scene": "Перетащите в сцену", "Catalog online": "Локальный каталог", "Browse cloud catalog": "Открыть каталог", "Import from CAD / URDF": "Импорт CAD / URDF", "Load layout": "Загрузить фабрику", "Active": "Активная", "Ready-to-run layouts": "Готовые рабочие фабрики", "Start from empty floor": "Начать с пустой сцены", "Infinite floor · Grid on": "Бесконечный пол · Сетка включена",
  "6-Axis Industrial Robot": "Промышленный робот", "Collaborative Robot": "Коллаборативный робот", "Spline Conveyor": "Сплайновый конвейер", "Roller Conveyor": "Роликовый конвейер", "Box Feeder": "Податчик изделий", "CNC Machining Center": "Обрабатывающий центр", "Hydraulic Press": "Гидравлический пресс", "Robotic Weld Cell": "Сварочная ячейка", "Case Packer": "Упаковочный станок", "Autonomous Mobile Robot": "Мобильный робот", "Counterbalance Forklift": "Вилочный погрузчик", "Pallet Racking": "Паллетный стеллаж", "Euro Pallet": "Европаллет", "Safety Fence": "Защитное ограждение", "Control Cabinet": "Шкаф управления", "Partition Wall": "Перегородка", "Operator": "Оператор",
  "Robot": "Робот", "Cobot": "Кобот", "Feeder": "Податчик", "Roller": "Ролики", "CNC": "ЧПУ", "Press": "Пресс", "Weld cell": "Сварка", "Case packer": "Упаковка", "Pallet": "Паллет", "Racking": "Стеллаж", "Forklift": "Погрузчик", "Fence": "Ограждение", "Cabinet": "Шкаф", "Safety & people": "Безопасность и люди", "Spline conveyor": "Сплайн-конвейер",
  "Output": "Вывод", "Statistics": "Статистика", "Sim time": "Время", "Throughput": "Производительность", "Stacked": "Уложено", "Pallets shipped": "Отгружено паллет", "Spawned": "Создано", "Dropped": "Упало", "Quality": "Качество", "Robot utilization": "Загрузка роботов", "Machines & pallets": "Станки и паллеты", "No robots in the scene.": "В сцене нет роботов.", "No machines or pallets in the scene.": "В сцене нет станков или паллет.", "Shrink": "Свернуть", "Expand": "Развернуть", "Apply & restart": "Применить и перезапустить", "Revert": "Вернуть", "Palletizer template": "Шаблон паллетирования", "Tending template": "Шаблон обслуживания",
  "idle": "ожидание", "moving": "движение", "waiting": "ожидание детали", "error": "ошибка", "stopped": "остановлен", "machining": "обработка", "patrol": "обход", "inspect": "контроль", "carry": "перенос", "replenish": "пополнение", "route blocked": "путь перекрыт", "Simulating": "Симуляция", "Ready": "Готово", "off": "выкл.", "No selection": "Ничего не выбрано",
  "Layout": "Компоновка", "Floor map": "План цеха", "View cube": "Куб вида", "Iso": "Изо", "Top": "Сверху", "Front": "Спереди", "Side": "Сбоку", "Fit": "Вписать", "Focus selection": "Показать выбранное", "Reset view": "Сбросить вид", "Toggle floor grid": "Показать сетку", "Toggle factory building": "Показать здание", "Toggle selection panel": "Панель выбранного", "Fullscreen": "Полный экран", "Reset simulation": "Сбросить симуляцию", "Pause (Space)": "Пауза (Пробел)", "Play (Space)": "Запуск (Пробел)", "Simulation speed": "Скорость симуляции", "Release to place component": "Отпустите, чтобы разместить компонент", "Live": "Работает",
  "Products": "Изделия", "Product": "Изделие", "Spawn product": "Создаваемое изделие", "Input product": "Входное изделие", "Output product": "Выходное изделие", "Any product": "Любое изделие", "Search name or tag...": "Название или тег...", "No matching products": "Изделия не найдены", "Food": "Еда", "Beverages": "Напитки", "Metal": "Металл", "Electronics": "Электроника", "Medical": "Медицина", "Packaging": "Упаковка", "Consumer": "Потребительские товары", "Automotive": "Автомобили", "Recipe": "Рецепт", "Product transformation": "Преобразование изделия", "One product in, one product out. The item keeps its physical identity.": "Одно изделие на входе, одно на выходе. Физический объект сохраняется.",
  "Running": "Работает", "End stopper": "Концевой упор", "Cycle time": "Время цикла", "Spawn interval": "Интервал подачи", "Speed": "Скорость", "Payload": "Грузоподъемность", "Force": "Усилие", "Height": "Высота", "Length": "Длина", "Voltage": "Напряжение", "Capacity": "Вместимость", "Rate": "Темп", "Levels": "Уровни", "Bays": "Секции", "Lift": "Подъем", "Load": "Нагрузка", "Stations": "Станции", "Type": "Тип", "Format": "Формат", "Require supply": "Нужны запасы", "Walk speed": "Скорость ходьбы", "Panel width": "Ширина панели", "Gate segment": "Сегмент ворот", "Gate open": "Ворота открыты",
  "Tool": "Инструмент", "Gripper": "Захват", "Vacuum cup": "Вакуумный", "Parallel jaws": "Параллельные губки", "Three-finger": "Трехпальцевый", "Magnetic": "Магнитный", "Soft gripper": "Мягкий захват", "Magnetic tools pick metal only. Other tools handle all products within payload limits.": "Магнитный захват берет только металл. Остальные работают в пределах грузоподъемности.",
  "Human tasks": "Задачи персонала", "Task": "Задача", "Stand by": "Ожидание", "Patrol route": "Обход территории", "Inspect products": "Контроль изделий", "Carry products": "Перенос изделий", "Replenish feeder": "Пополнение податчика", "Hat": "Головной убор", "None": "Нет", "Hard hat": "Каска", "Cap": "Кепка", "Safety glasses": "Защитные очки", "Source station": "Исходная станция", "Destination station": "Конечная станция", "Nearest station": "Ближайшая станция", "Completed tasks": "Выполнено задач",
  "Pallet pattern": "Схема паллетирования", "Columns": "Столбцы", "Rows": "Ряды", "Layers": "Слои", "Gap": "Зазор", "Generate pattern": "Создать схему", "Preview": "Предпросмотр", "Layer": "Слой", "Automatic pallet sizing": "Авторазмер паллета", "Pallet size follows the pattern and product dimensions.": "Размер паллета зависит от схемы и размеров изделия.",
  "Visual builder": "Визуальный редактор", "Code": "Код", "Create a task": "Создать задачу", "Pick & palletize": "Взять и уложить", "Pick & place": "Взять и переместить", "Tend a machine": "Обслужить станок", "Source": "Источник", "Destination": "Назначение", "Processing machine": "Обрабатывающий станок", "Choose component": "Выберите компонент", "Repeat": "Повторять", "Delay": "Задержка", "Clearance": "Высота подхода", "Link task": "Связать задачу", "Task linked": "Задача связана", "Auto approach": "Автоподход", "Live targets": "Живые цели", "Waiting for product": "Ожидание изделия", "Pick": "Взять", "Process": "Обработать", "Place": "Положить", "Repeat cycle": "Повторить цикл", "Reach checked": "Досягаемость проверена", "Move target closer": "Подвиньте цель ближе", "Bindings follow moved components. Approach and release are calculated automatically.": "Связи следуют за компонентами. Подход и отпускание рассчитываются автоматически.", "Select a robot to build its workflow.": "Выберите робота для создания программы.", "Apply code": "Применить код", "Custom JavaScript": "Пользовательский JavaScript", "Use visual builder": "Визуальный редактор", "Code mode is for trusted project scripts only.": "Режим кода предназначен только для доверенных скриптов.",
  "AI Factory - procedural line generator": "Генератор фабрик", "Describe the factory": "Опишите фабрику", "Interpret": "Разобрать", "Line shape": "Форма линии", "Straight": "Прямая", "L-shape": "Г-образная", "U-shape": "П-образная", "S-curve": "S-образная", "Machining cells": "Обрабатывающие ячейки", "Processing cells": "Обрабатывающие ячейки", "Robot type": "Тип робота", "Industrial": "Промышленный", "Feed rate": "Темп подачи", "Safety fences": "Защитные ограждения", "Operators": "Операторы", "Control cabinets": "Шкафы управления", "Seed": "Зерно", "Random seed": "Случайное зерно", "Layout preview": "План фабрики", "Reset options": "Сбросить настройки", "Build factory": "Построить фабрику", "Factory type": "Тип производства", "Metalworking": "Металлообработка", "Cookie bakery": "Производство печенья", "Bottling": "Розлив напитков", "Electronics assembly": "Сборка электроники", "Medical filling": "Фасовка лекарств", "Parcel logistics": "Логистика посылок", "Parallel lines": "Параллельные линии", "Belt speed": "Скорость ленты", "Advanced options": "Дополнительные настройки", "Staff task": "Задача персонала", "Recipe products": "Изделия рецепта", "Recipes include live robot workflows, product transformations and pallet patterns.": "Рецепты включают программы роботов, преобразование изделий и схемы паллетирования.", "Local procedural generator, no cloud or AI service required.": "Локальный процедурный генератор, облако и ИИ-сервис не требуются.",
  "Project saved": "Проект сохранен", "Project exported": "Проект экспортирован", "Project imported": "Проект импортирован", "Could not import that project file": "Не удалось импортировать файл проекта", "Save failed - storage unavailable": "Не удалось сохранить: хранилище недоступно", "Factory generated - simulation running": "Фабрика создана, симуляция запущена", "New factory created": "Новая фабрика создана", "Select a component first": "Сначала выберите компонент", "Select a conveyor first": "Сначала выберите конвейер", "Select a path component first": "Выберите компонент с траекторией", "Program template applied": "Шаблон программы применен", "Add a robot first": "Сначала добавьте робота", "Add a conveyor next to the robot first": "Сначала добавьте конвейер рядом с роботом", "Add a pallet next to the robot first": "Сначала добавьте паллет рядом с роботом", "Tending needs a CNC and a second (output) conveyor": "Нужны станок и второй выходной конвейер", "Share link copied": "Ссылка скопирована", "Share link ready in the address bar": "Ссылка находится в адресной строке", "Nothing loose to arrange - production equipment is left where it is": "Нет свободных компонентов: оборудование линии остается на месте", "Loose components tidied into a row": "Свободные компоненты выстроены в ряд",
  "Touch workspace": "Сенсорный интерфейс", "Scene": "Сцена", "Catalog": "Каталог", "Project": "Проект", "Factory": "Фабрика", "Settings": "Настройки", "One finger to orbit. Pinch to zoom.": "Поворот одним пальцем. Масштаб двумя пальцами.", "Tap a component, then choose Move to reposition it.": "Нажмите на компонент и выберите «Двигать».", "Close panel": "Закрыть панель", "Close sheet": "Закрыть панель", "Export TXT": "Экспорт TXT", "Import TXT": "Импорт TXT", "Saved projects": "Сохраненные проекты", "Mobile detected": "Обнаружено мобильное устройство", "Version 5.1": "Версия 5.1",
  "About Larp Components": "О Larp Components", "Independent browser sandbox inspired by factory-simulation workflows. Not affiliated with Visual Components. No PLC connections or certified robot-controller exports.": "Независимая браузерная песочница для моделирования фабрик. Не связана с Visual Components. Подключение ПЛК и сертифицированный экспорт на роботов не поддерживаются.",
  ".lcmx - Larp Components 5.1": ".lcmx - Larp Components 5.1",
  "Click": "Нажмите",
  "in the ribbon to procedurally generate a complete, working production line.": "на ленте, чтобы создать полноценную рабочую фабрику.",
  "Select a component in the 3D view to edit its parameters, spline and robot program.": "Выберите компонент в 3D-сцене, чтобы изменить параметры, траекторию и программу робота.",
  "Robots are programmed in JavaScript with the Larp robot API (pick, place, waitForPart, machine and pallet helpers).": "Создайте задачу визуально или напишите JavaScript с API Larp: pick, place, waitForPart и помощники станков и паллет.",
  "Add a robot to the scene to write a program for it.": "Добавьте робота в сцену, чтобы создать его программу.",
  "Start from an engineered line, then adapt equipment, routes and takt times.": "Выберите готовую рабочую линию и измените оборудование, маршруты и темп.",
  "Edit the selected robot's program": "Изменить программу выбранного робота",
  "Load the machine tending template": "Применить шаблон обслуживания станка",
  "Load the palletizing template": "Применить шаблон паллетирования",
  "Close menu": "Закрыть меню",
  "machines": "станков",
  "robots": "роботов",
  "components": "компонентов",
  "cycles": "циклов",
  "parts": "деталей",
  "stacked": "уложено",
  "dropped": "упало",
  "assets": "объектов",
  "cartons in play": "изделий в сцене",
  "boxes · shipped": "изделий · отгружено",
  "pts ·": "точек ·",
  "robots ·": "роботов ·",
  "cycles ·": "циклов ·",
  "· shipped": "· отгружено",
  "Tool:": "Инструмент:",
  "Snap:": "Привязка:",
  "Selected:": "Выбрано:",
  "slots": "ячеек",
  "m": "м",
  "s": "с",
  "kg": "кг",
  "m/s": "м/с",
  "products / min": "изделий / мин",
  " /min": " /мин",
  "Category": "Категория",
  "Supply": "Запасы",
  "Fence path": "Траектория ограждения",
  "Drag the posts to draw a sharp-cornered guard fence. Panels and corner posts are generated automatically.": "Перетаскивайте стойки для построения ограждения с четкими углами. Панели и угловые стойки создаются автоматически.",
  "Drag the handles to bend the belt. Reverse flow swaps the entry and exit, including the stopper.": "Перетаскивайте точки, чтобы изогнуть ленту. Обратный ход меняет местами вход, выход и упор.",
  "Destination is outside robot reach. Move it closer to continue.": "Цель вне досягаемости робота. Подвиньте ее ближе, чтобы продолжить.",
  "Choose a source in the visual program": "Выберите источник в визуальной программе",
  "unsaved": "не сохранено",
  "Billets become precision parts.": "Заготовки превращаются в точные детали.",
  "Bake dough into chocolate chip cookies.": "Тесто превращается в печенье с шоколадом.",
  "Fill empty bottles and stack the finished product.": "Пустые бутылки наполняются, готовые изделия укладываются на паллет.",
  "Turn circuit boards into assembled devices.": "Печатные платы превращаются в собранные устройства.",
  "Fill medical vials in a collaborative cell.": "Медицинские флаконы заполняются в коллаборативной ячейке.",
  "Direct carton transport and palletizing.": "Перемещение коробок и автоматическое паллетирование.",
  "e.g. U-shaped cookie bakery with 2 cells": "Например: П-образная пекарня с 2 ячейками",
  "This project contains executable JavaScript. Only open scripts from a trusted source. Continue?": "Проект содержит исполняемый JavaScript. Открывайте скрипты только из доверенных источников. Продолжить?",
  "program started": "программа запущена",
  "visual program started": "визуальная программа запущена",
  "program applied": "программа применена",
  "program finished": "программа завершена",
  "Simulation reset": "Симуляция сброшена",
  "pallet shipped": "паллет отгружен",
  "OnAppInitialized": "Приложение запущено",
  "physics engine ready (60 Hz fixed step)": "физический движок готов (шаг 60 Гц)",
  "RoboticsAPI: robot programs are JavaScript - open the PROGRAM tab to edit them": "RoboticsAPI: программы роботов на JavaScript. Откройте вкладку «ПРОГРАММА» для редактирования.",
  "AIFactory: ready. Describe the factory, then press 'Build factory'.": "Генератор готов. Опишите фабрику и нажмите «Построить фабрику».",
  "Popular": "Популярное",
  "New": "Новое",
  "Core": "Базовое",
  "Target": "Цель",
  "Featured layout": "Готовая фабрика",
  "Compact cell": "Компактная ячейка",
  "Large layout": "Большая фабрика",
  "Machine Tending Line": "Линия обслуживания станков",
  "Palletizing Line": "Линия паллетирования",
  "Cobot Machining Cell": "Ячейка с коботами",
  "U-Shaped Plant": "П-образная фабрика",
  "Blank Factory": "Пустая фабрика",
  "Assembly cell": "Сборочная ячейка",
  "Untitled factory": "Новая фабрика",
  "Feeder, CNC tending robot and palletizer on an L-shaped spline line.": "Податчик, станок с роботом и паллетизатор на Г-образной линии.",
  "High-rate carton feed with a robot stacking pallets.": "Поток коробок с роботом для укладки на паллеты.",
  "Collaborative robots tending a CNC with a compact pallet.": "Коботы обслуживают станок и укладывают изделия на компактный паллет.",
  "Two machining stages folded into a U to save floor space.": "Два этапа обработки на П-образной линии для экономии места.",
  "width": "ширина",
  "Width": "Ширина",
  "reach": "досягаемость",
  "Reach": "Досягаемость",
  "Cycle": "Цикл",
  "Spindle": "Шпиндель",
  "Size": "Размер",
  "Slots": "Ячейки",
  "Takt": "Такт",
  "High-payload articulated robot, programmable with the Larp robot API.": "Промышленный робот с программированием через API Larp.",
  "Safe, compact arm for collaborative work cells.": "Компактный манипулятор для коллаборативных ячеек.",
  "Drops cartons onto the belt at a configurable rate.": "Подает изделия на ленту с заданным темпом.",
  "Belt conveyor defined by a spline - drag the handles to reshape it.": "Ленточный конвейер по сплайну. Изменяйте форму перетаскиванием точек.",
  "Powered roller transport section, also spline based.": "Роликовый приводной конвейер по сплайну.",
  "Enclosed machining cell with a load tray the robot can tend.": "Обрабатывающая ячейка с загрузочным лотком для робота.",
  "Forming station with guarded front opening.": "Формовочная станция с защитным ограждением.",
  "Two-station welding cell with fume extraction.": "Сварочная ячейка с двумя станциями и вытяжкой.",
  "End-of-line carton erecting and packing machine.": "Станок для упаковки в конце производственной линии.",
  "LiDAR-guided AMR with configurable transport loop.": "Мобильный робот с настраиваемым транспортным маршрутом.",
  "Manual logistics vehicle for pallet handling.": "Транспорт для работы с паллетами.",
  "Four-level selective pallet storage bay.": "Четырехуровневый паллетный стеллаж.",
  "Pallet the robot stacks boxes onto - grid size is configurable.": "Паллет для укладки изделий роботом с настраиваемой схемой.",
  "Modular perimeter guarding.": "Модульное защитное ограждение.",
  "PLC and safety controller cabinet for the line.": "Шкаф управления и безопасности линии.",
  "Floor-to-ceiling modular partition panel.": "Модульная перегородка от пола до потолка.",
  "Human mannequin for safety and ergonomics checks.": "Оператор для рабочих задач, контроля и логистики.",
  "Click to select · drag to orbit · scroll to zoom": "Выбор нажатием · поворот перетаскиванием · масштаб колесом",
  "Drag a component to move it": "Перетаскивайте компонент для перемещения",
  "Drag around a component to rotate it": "Перетаскивайте вокруг компонента для поворота",
  " · drag the white handles to bend the spline": " · перетаскивайте белые точки для изменения траектории",
  "Search workspace": "Поиск в проекте",
  "Supply depleted": "Запасы закончились",
  "Loop ran too long without `await` - add `await robot.wait(0.1)` inside the loop": "Цикл слишком долго работает без await. Добавьте await robot.wait(0.1) внутрь цикла.",
  "Robot R-": "Робот R-",
  "Conveyor ": "Конвейер ",
  "Pallet P-": "Паллет P-",
  "Feeder F-": "Податчик F-",
  "Cell Guarding": "Ограждение ячейки",
  "Cell Controller ": "Шкаф управления ",
  "Operator A. Chen": "Оператор А. Чен",
  "CNC M-": "Станок M-",
  "Bindings follow moved components.": "Связи следуют за компонентами.",
  "Local catalog": "Локальный каталог",
  "Source is outside robot reach.": "Источник находится вне досягаемости робота.",
  "Some pallet slots are outside reach. Reduce the pattern or use an industrial robot.": "Некоторые ячейки вне досягаемости. Уменьшите схему или выберите промышленного робота.",
  "Processing machine is outside robot reach.": "Станок находится вне досягаемости робота.",
  "select": "выбор",
  "move": "перемещение",
  "rotate": "поворот",
  "food": "еда",
  "bakery": "выпечка",
  "raw": "сырье",
  "cookie": "печенье",
  "biscuit": "печенье",
  "chocolate": "шоколад",
  "bread": "хлеб",
  "candy": "сладости",
  "sweet": "сладости",
  "fruit": "фрукты",
  "apple": "яблоко",
  "packaged": "упаковано",
  "bottle": "бутылка",
  "drink": "напиток",
  "plastic": "пластик",
  "empty": "пустое",
  "water": "вода",
  "juice": "сок",
  "aluminium": "алюминий",
  "can": "банка",
  "glass": "стекло",
  "jar": "банка",
  "metal": "металл",
  "steel": "сталь",
  "part": "деталь",
  "finished": "готовое",
  "gear": "шестерня",
  "automotive": "авто",
  "press": "пресс",
  "sheet": "лист",
  "housing": "корпус",
  "weld": "сварка",
  "frame": "рама",
  "electronics": "электроника",
  "board": "плата",
  "phone": "телефон",
  "device": "устройство",
  "battery": "аккумулятор",
  "energy": "энергия",
  "medical": "медицина",
  "pharma": "фарма",
  "vial": "флакон",
  "medicine": "лекарство",
  "filled": "наполненное",
  "soap": "мыло",
  "consumer": "товары",
  "cosmetics": "косметика",
  "toy": "игрушка",
  "rubber": "резина",
  "wheel": "колесо",
  "parcel": "посылка",
  "V select · M move · R rotate · G snap · Space play · Ctrl+Z undo · Del delete · Ctrl+D duplicate": "V выбор · M перемещение · R поворот · G привязка · Пробел запуск · Ctrl+Z отмена · Del удалить · Ctrl+D копировать",
  "Help: Ctrl+K search · V/M/R tools · Space play · Ctrl+Z undo": "Ctrl+K поиск · V/M/R инструменты · Пробел запуск · Ctrl+Z отмена",
  "added": "добавлен",
  "removed": "удален",
  "duplicated": "скопирован",
  "loaded": "загружен",
  "built": "создано",
  "components)": "компонентов)",
  "program template applied": "шаблон программы применен",
  "processing cells": "обрабатывающих ячеек",
  "Feeder F-01": "Податчик F-01",
  "Robot R-01": "Робот R-01",
  "Robot R-02": "Робот R-02",
  "Conveyor 1": "Конвейер 1",
  "Conveyor 2": "Конвейер 2",
  "CNC M-01": "Станок M-01",
  "Pallet P-01": "Паллет P-01",
  "Cell Controller 1": "Шкаф управления 1",
  "Paste": "Вставить",
  "Copy & paste": "Копировать и вставить",
  "Save / export project": "Сохранить / экспорт проекта",
  "Save project (exports .txt)": "Сохранить проект (экспорт .txt)",
  "Saved": "Сохранено",
  "Simulation settings": "Настройки симуляции",
  "Clock Display Mode": "Формат часов",
  "Simulation Run Time": "Время симуляции",
  "Warm Up Time": "Время прогрева",
  "Simulation Level": "Уровень симуляции",
  "Simulation Mode": "Режим симуляции",
  "Real Time": "Реальная скорость",
  "Virtual Time": "Виртуальное время",
  "Custom": "Свой",
  "Simulation speed multiplier": "Скорость симуляции (множитель)",
  "Simulation is limited by device performance; the displayed rate is the actual speed.": "Скорость ограничена производительностью устройства; показан фактический множитель.",
  "UI skin": "Оформление интерфейса",
  "Larp UI": "Larp UI",
  "Visual Components": "Visual Components",
  "R-pro": "R-pro",
  "Standard": "Стандарт",
  "Enhanced": "Улучшенное",
  "Max": "Максимум",
  "Cornell benchmark room (DEV)": "Тестовая комната Корнелла (DEV)",
  "Current crisp shadows": "Текущие четкие тени",
  "Environment lighting and 4K shadows": "Окружающее освещение и тени 4K",
  "Approximate indoor GI and stronger bounce light": "Приближенное глобальное освещение помещения",
  "Factory building": "Здание фабрики",
  "Walls": "Стены",
  "Roof": "Крыша",
  "Ceiling lights": "Потолочные светильники",
  "Wall": "Стена",
  "Products received": "Изделий получено",
  "Receive box": "Приемный ящик",
  "Signal target": "Получатель сигнала",
  "Not connected": "Не подключено",
  "Address": "Адрес",
  "Press button": "Нажать кнопку",
  "Release button": "Отпустить кнопку",
  "Normally closed": "Нормально замкнутый",
  "Live signal": "Текущий сигнал",
  "Signal": "Сигнал",
  "Automation": "Автоматизация",
  "Connectivity": "Связи",
  "Production flow": "Производственный поток",
  "Operations": "Операции",
  "Resources": "Ресурсы",
  "Process engineering": "Проектирование процессов",
  "Drawing": "Черчение",
  "Layout drawing": "План цеха",
  "Push button": "Кнопка",
  "Laser trigger": "Лазерный датчик",
  "Proximity sensor": "Датчик приближения",
  "PLC control": "ПЛК",
  "Signals & API": "Сигналы и API",
  "Robot I/O": "Входы/выходы робота",
  "Connected Variables": "Подключенные переменные",
  "Connected to": "Подключено к",
  "Beam": "Луч",
  "Paint station": "Окрасочная станция",
  "Laser cutter": "Лазерный резак",
  "Assembly": "Сборка",
  "Assembly station": "Сборочная станция",
  "Kiln": "Печь",
  "Industrial kiln": "Промышленная печь",
  "Mobile robot": "Мобильный робот",
  "KUKA Industrial Robot": "Промышленный робот KUKA",
  "FANUC Industrial Robot": "Промышленный робот FANUC",
  "Mobile Manipulator": "Мобильный манипулятор",
  "Paint colour": "Цвет краски",
  "Required parts": "Количество деталей",
  "Multiple parts are combined into one assembly.": "Несколько деталей объединяются в одну сборку.",
  "Paint product": "Окрасить изделие",
  "Assemble parts": "Собрать детали",
  "Per-cell recipe": "Рецепт каждой ячейки",
  "Parallel columns": "Параллельные колонны",
  "Brick factory": "Кирпичный завод",
  "Assembly plant": "Сборочный завод",
  "Clay brick blank": "Глиняная заготовка",
  "Fired brick": "Обожженный кирпич",
  "Brick pack": "Упаковка кирпича",
  "Painted housing": "Окрашенный корпус",
  "Cat ears": "Кошачьи ушки",
  "Headphones": "Наушники",
  "Earrings": "Серьги",
  "Delivery robot task": "Задача робота-доставщика",
  "Human": "Человек",
  "Cell": "Ячейка",
  "Cutter": "Резак",
  "Lights also respond to the enhanced and global-illumination graphics modes.": "Светильники работают в улучшенном режиме и режиме глобального освещения.",
  "Double-click to reset to 1.0": "Двойной щелчок — сброс к 1.0",
  "Export copy": "Экспорт копии",
  "Save project to its exported file (Ctrl+S)": "Сохранить проект в его экспортированный файл (Ctrl+S)",





  "Machines &amp; pallets": "Станки и паллеты",





















  "Collections": "Коллекции",









  "Open layout": "Открыть компоновку",








  "Export copy (.txt)": "Экспорт копии (.txt)",


  "Graphics": "Графика",
  "x": "x",






















  "Light": "Свет",

  "Light type": "Тип света",
  "Spot": "Прожектор",
  "Point": "Точечный",
  "Colour": "Цвет",
  "Light colour": "Цвет света",
  "Cast shadows": "Отбрасывать тени",
















  "X": "X",
  "· Z": "· Z",













  "Collapse panels": "Свернуть панели",
  "Slower": "Медленнее",
  "Faster": "Быстрее",
  "Default": "По умолчанию",
  "Detailed": "Детальный",
  "Fast": "Быстрый",
  "Toggle side panels": "Боковые панели",
  "Toggle grid": "Сетка",
  "Exposure": "Экспозиция",
  "Ambient light": "Окружающий свет",
  "Sun intensity": "Яркость солнца",
  "Fill light": "Заполняющий свет",
  "Environment reflections": "Отражения окружения",
  "Product brightness": "Яркость изделий",
  "Shadow quality": "Качество теней",
  "Resolution scale": "Масштаб разрешения",
  "Shadows": "Тени",
  "Distance fog": "Туман дали",
  "Floor grid": "Сетка пола",
  "Background": "Фон",
  "Skin default": "По умолчанию",
  "Balanced for everyday work": "Сбалансировано для повседневной работы",

  "Save copy": "Сохранить копию",

  "Import": "Импорт",




  "Cell Graph": "Граф ячеек",
  "Devices": "Устройства",
  "Files": "Файлы",
  "Wire": "Провод",
  "Connect wire": "Подключить провод",
  "Signal ON": "Сигнал ВКЛ",
  "Signal OFF": "Сигнал ВЫКЛ",
  "Counter": "Счётчик",
  "Reset counter": "Сбросить счётчик",
  "Paint process": "Процесс окраски",
  "Paint color": "Цвет краски",
  "Assembly inputs": "Входы сборки",
  "Secondary product": "Вторичное изделие",


  "Work target": "Рабочая цель",
  "Completed": "Выполнено",

  "Apply program": "Применить программу",
  "Program applied": "Программа применена",







  "Larp industrial": "Larp промышленный",
  "Worker": "Рабочий",
  "Machine": "Станок",

  "CNC lathe": "Токарный ЧПУ",
  "5-axis mill": "5-осевой фрезерный",


  "Paint booth": "Окрасочная камера",
  "Brick press": "Кирпичный пресс",













  "All stations ready": "Все станции готовы",






  "Studio settings": "Настройки студии",
  "Depth": "Глубина",

  "Roof visible": "Крыша видна",
  "Wall color": "Цвет стен",
  "Floor color": "Цвет пола",
  "Magnetic tools pick metal only. Paint tools apply the program colour to an existing product.": "Магнитные захваты берут только металл. Краскопульты наносят цвет программы на существующее изделие.",
  "Open the conveyor end stopper to drop products into this box. Every product that settles is counted once.": "Откройте концевой упор конвейера, чтобы изделия падали в этот ящик. Каждое осевшее изделие считается один раз.",
  "Ctrl K": "Ctrl K",
  "full - waiting for pick-up": "заполнен — ожидание вывоза",
  "products received": "изделий получено",
  "motion timed out": "превышено время движения",
  "is out of reach": "вне досягаемости",
  "place() called without a part in the gripper": "place() вызван без детали в захвате",
  "SyntaxError": "Синтаксическая ошибка",
  "template applied": "шаблон применён",
  "pressed": "нажата",
  "released": "отпущена",
  "target (": "цель (",
  "AIFactory: built": "Сгенерировано фабрикой ИИ:",
  "components (": "компонентов (",
  "robots)": "роботов)",


  "Cobots": "Коботы",













  "IP": "IP",



  "Enclosed 3-axis machining cell with a load tray the robot can tend.": "Закрытая 3-осевая ячейка с загрузочным лотком для робота.",





















  "KUKA": "KUKA",
  "FANUC": "FANUC",





  "Paint sprayer": "Краскопульт",


  "Precision turning": "Точная токарная обработка",





  "Turn metal blanks into a finished round part.": "Токарная обработка заготовок в готовые круглые детали.",
  "Fire clay blanks into bricks and pack them.": "Обжиг глиняных заготовок в кирпичи и их упаковка.",
  "Combine components into finished assemblies.": "Сборка компонентов в готовые узлы.",



  "Combined process detected": "Обнаружен комбинированный процесс",







  "Construction": "Строительство",
  "Painted": "Окрашенные",



  "Beanie": "Шапка",













  "Trigger": "Триггер",
  "Start trigger": "Стартовый триггер",




















  "Larp Components 5.1 - physics engine ready (60 Hz fixed step)": "Larp Components 5.1 — физический движок готов (шаг 60 Гц)",
  "Larp Components 5.1 - browser factory simulation": "Larp Components 5.1 — браузерная симуляция фабрики",
  "Antialiasing": "Сглаживание",
  "Off": "Выкл.",
  "FXAA (fast)": "FXAA (быстро)",
  "MSAA (smooth)": "MSAA (гладко)",
  "Fully customizable colours": "Полностью настраиваемые цвета",
  "Reset colours": "Сбросить цвета",
  "Window background": "Фон окна",
  "Title bar": "Строка заголовка",
  "Tab bar": "Полоса вкладок",
  "Ribbon": "Лента",
  "Panels": "Панели",
  "Bottom dock": "Нижняя панель",
  "3D viewport": "3D-вид",
  "Status bar": "Строка состояния",
  "Chrome text": "Текст интерфейса",
  "Accent": "Акцент",
  "Dock panel": "Прикрепить панель",
  "Detach panel": "Отсоединить панель",
  "Output dock": "Панель вывода",
  "Reset layout": "Сбросить раскладку",
  "Drag a panel's inner edge to resize it. The button in each panel header detaches it into a movable window; the same button docks it again.": "Потяните внутренний край панели, чтобы изменить размер. Кнопка в заголовке панели отсоединяет ее в перемещаемое окно; та же кнопка возвращает ее на место.",
  "Resize panel": "Изменить размер панели",
  "Drag to resize": "Потяните, чтобы изменить размер",
  "Resize window": "Изменить размер окна",
  "Windows": "Окна",
  "Show Catalog": "Показать каталог",
  "Hide Catalog": "Скрыть каталог",
  "Show Properties": "Показать свойства",
  "Hide Properties": "Скрыть свойства",
  "Show Output": "Показать вывод",
  "Hide Output": "Скрыть вывод",
  "Open floor map": "Открыть план цеха",
  "Click an object to select it": "Нажмите на объект, чтобы выбрать его",
  "workers": "рабочих",
  "Restore the default panel arrangement": "Вернуть расположение панелей по умолчанию",
  "T-shirt colour": "Цвет футболки",
  "For a worker this colour is the T-shirt colour.": "Для рабочего этот цвет задает цвет футболки.",
  "Hat colour": "Цвет каски",
  "The worker colour sets the T-shirt. Hats and caps follow the hat colour; the hi-vis default is yellow.": "Цвет рабочего задает цвет футболки. Каска и кепка используют свой цвет; по умолчанию каска желтая.",
  "Layout reset": "Раскладка сброшена",
  "Float": "Отделить",
  "Docked": "В доке",
  "Color scheme": "Цветовая схема",
  "Custom skin": "Своя тема",
  "Fully customizable color scheme": "Полностью настраиваемая цветовая схема",
  "Show frame rate": "Показывать частоту кадров",
  "3D resolution": "Разрешение 3D",
  "Node graph": "Граф узлов",
  "Add node": "Добавить узел",
  "Valid graph": "Граф корректен",
  "error(s)": "ошибок",
  "warning(s)": "предупреждений",
  "nodes": "узлов",
  "Tags found": "Найденные теги",
  "Recipe default": "Из рецепта",
  "Select a node to edit its settings.": "Выберите узел, чтобы изменить его настройки.",
  "Drag from an output port to an input port to wire sections together. Every node is one part of the factory.": "Тяните от выходного порта к входному, чтобы соединить секции. Каждый узел — часть фабрики.",
  "Values you change here override what the prompt asked for. Untouched values follow the prompt, then the defaults.": "Изменённые здесь значения переопределяют запрос. Нетронутые следуют запросу, затем значениям по умолчанию.",
  "Click to remove this wire": "Нажмите, чтобы удалить связь",
  "Collapse": "Свернуть",
  "set": "задано",
  "Delete node": "Удалить узел",
  "Graph imported": "Граф импортирован",
  "Starter graph restored": "Стартовый граф восстановлен",
  "Export graph": "Экспорт графа",
  "Import graph": "Импорт графа",
  "Reset to starter graph": "Вернуть стартовый граф",
  "That file is not a factory graph.": "Этот файл не является графом фабрики.",
  "Fix the graph errors first.": "Сначала исправьте ошибки графа.",
  "Cannot connect those ports.": "Эти порты нельзя соединить.",
  "Connect the graph to see a preview.": "Соедините граф, чтобы увидеть предпросмотр.",
  "Each node is one section of the factory. Wire the output of a section into the Factory output node.": "Каждый узел — секция фабрики. Подключите выход секции к узлу вывода фабрики.",
  "This node has no settings; it uses whatever is wired into it.": "У узла нет настроек: он использует то, что подключено.",
  "Unknown node type": "Неизвестный тип узла",
  "drag to an input port": "перетащите к входному порту",
  "Describe the factory…": "Опишите фабрику…",
  "Factory generator": "Генератор фабрики",
  "Input": "Вход",
  "Prompt": "Запрос",
  "Recipe & products": "Рецепт и продукты",
  "Process chain": "Цепочка операций",
  "Line speed": "Скорость линии",
  "Robot & tool": "Робот и инструмент",
  "Line layout": "Компоновка линии",
  "Factory output": "Вывод фабрики",
  "Intent": "Намерение",
  "Config": "Параметры",
  "Cells": "Ячейки",
  "Scene items": "Объекты сцены",
  "Brand": "Бренд",
  "People": "Человек",
  "Fences": "Ограждения",
  "Cabinets": "Шкафы",
  "Shape": "Форма",
  "Cell worker": "Исполнитель ячейки",
  "Operation": "Операция",
  "From proposal": "Из предложения",
  "CNC milling": "Фрезерный станок",
  "Turning lathe": "Токарный станок",
  "Surface grinder": "Плоскошлифовальный станок",
  "Free text. Tags are extracted with their exact source words.": "Свободный текст. Теги извлекаются вместе с исходными словами.",
  "Products per minute.": "Продуктов в минуту.",
  "Metres per second.": "Метров в секунду.",
  "Seconds per machine operation.": "Секунд на операцию.",
  "Optional. Uses the process steps found in the prompt.": "Необязательно. Использует операции из запроса.",
  "Force every cell to one machine type, or follow the recipe.": "Принудительно задать тип станка для всех ячеек или следовать рецепту.",
  "Slower and smaller, but can work without a full safety cage.": "Медленнее и меньше, но может работать без полного ограждения.",
  "The graph needs a Factory output node to build anything.": "Для сборки нужен узел «Вывод фабрики».",
  "The output node did not produce a factory. Connect a recipe or prompt to it.": "Узел вывода не построил фабрику. Подключите к нему рецепт или запрос.",
  "is not connected to anything.": "ни к чему не подключён.",
  "The graph has a loop through": "В графе цикл из",
  "node(s). Remove one of the wires to continue.": "узла(ов). Удалите одну из связей, чтобы продолжить.",
  "accepts one wire.": "принимает только одну связь.",
  "is required.": "обязателен.",
  "expects": "ожидает",
  "but receives": "но получает",
  "a wire points at a node that no longer exists.": "связь указывает на узел, которого больше нет.",
  "Bakery": "Пекарня",
  "Welding": "Сварка",
  "Painting": "Окраска",
  "Pressing": "Штамповка",
  "Grinding": "Шлифовка",
  "Milling": "Фрезеровка",
  "Cutting": "Резка",
  "Turning": "Точение",
  "U-shaped line": "П-образная линия",
  "L-shaped line": "Г-образная линия",
  "S-curve line": "S-образная линия",
  "Straight line": "Прямая линия",
  "Industrial robot": "Промышленный робот",
  "No fences": "Без ограждений",
  "Two lines": "Две линии",
};

let pattern: RegExp | null = null;
export function t(text: string | number | undefined | null): string {
  const value = String(text ?? "");
  if (language === "en") return value;
  if (RU[value]) return RU[value];
  if (!pattern) {
    const keys = Object.keys(RU).filter((key) => key.length > 3).sort((a, b) => b.length - a.length).map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    pattern = new RegExp(`(?<![A-Za-z])(${keys.join("|")})(?![A-Za-z])`, "g");
  }
  return value.replace(pattern, (match) => RU[match] ?? match).replace(/\b(m\/s|kg|rpm|ppm|min|m|s)\b/g, (unit) => ({ "m/s": "м/с", kg: "кг", rpm: "об/мин", ppm: "шт/мин", min: "мин", m: "м", s: "с" })[unit] ?? unit);
}