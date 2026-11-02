export type ProductShape = "box" | "cookie" | "cylinder" | "bottle" | "sphere" | "gear" | "board" | "frame";

export interface Product {
  id: string;
  name: string;
  ru: string;
  category: string;
  tags: string[];
  shape: ProductShape;
  size: [number, number, number];
  color: number;
  mass: number;
  magnetic?: boolean;
}

const p = (id: string, name: string, ru: string, category: string, shape: ProductShape, size: Product["size"], color: number, mass: number, tags: string[], magnetic = false): Product =>
  ({ id, name, ru, category, shape, size, color, mass, tags, magnetic });

export const PRODUCTS: Product[] = [
  p("carton", "Cardboard box", "Картонная коробка", "Packaging", "box", [0.34, 0.26, 0.34], 0xb89a6c, 1.2, ["box", "carton", "parcel", "коробка", "упаковка"]),
  p("dough", "Cookie dough", "Тесто для печенья", "Food", "cookie", [0.26, 0.08, 0.26], 0xe7c991, 0.12, ["food", "bakery", "raw", "cookie", "еда", "тесто", "выпечка"]),
  p("cookie", "Chocolate chip cookie", "Печенье с шоколадом", "Food", "cookie", [0.26, 0.07, 0.26], 0xbf8541, 0.12, ["cookie", "food", "bakery", "biscuit", "chocolate", "еда", "печенье", "шоколад"]),
  p("bread", "Bread loaf", "Буханка хлеба", "Food", "box", [0.28, 0.15, 0.2], 0xdca74f, 0.45, ["food", "bakery", "bread", "еда", "хлеб", "выпечка"]),
  p("chocolate", "Chocolate bar", "Плитка шоколада", "Food", "board", [0.28, 0.04, 0.16], 0x654130, 0.1, ["food", "candy", "sweet", "еда", "шоколад", "сладости"]),
  p("apple", "Apple", "Яблоко", "Food", "sphere", [0.19, 0.19, 0.19], 0xd84d38, 0.18, ["food", "fruit", "apple", "еда", "фрукт", "яблоко"]),
  p("cookie-box", "Cookie gift box", "Коробка печенья", "Packaging", "box", [0.32, 0.14, 0.24], 0xc88856, 0.6, ["food", "cookie", "packaged", "еда", "печенье", "упаковка"]),
  p("empty-bottle", "Empty bottle", "Пустая бутылка", "Beverages", "bottle", [0.14, 0.3, 0.14], 0xc0e1e9, 0.08, ["bottle", "drink", "plastic", "empty", "бутылка", "напитки", "пластик"]),
  p("water", "Water bottle", "Бутылка воды", "Beverages", "bottle", [0.14, 0.3, 0.14], 0x65b9e6, 0.6, ["food", "water", "drink", "bottle", "вода", "напитки", "бутылка"]),
  p("juice", "Orange juice", "Апельсиновый сок", "Beverages", "bottle", [0.16, 0.3, 0.16], 0xf4a934, 0.7, ["food", "juice", "drink", "bottle", "сок", "напитки", "бутылка"]),
  p("can", "Beverage can", "Банка напитка", "Beverages", "cylinder", [0.16, 0.25, 0.16], 0xde6157, 0.35, ["food", "drink", "aluminium", "can", "напитки", "банка"]),
  p("jar", "Glass jar", "Стеклянная банка", "Packaging", "cylinder", [0.19, 0.22, 0.19], 0x8bb8a0, 0.4, ["glass", "food", "jar", "стекло", "банка", "упаковка"]),
  p("billet", "Steel billet", "Стальная заготовка", "Metal", "box", [0.3, 0.18, 0.22], 0x727f8c, 2.4, ["metal", "raw", "steel", "cnc", "металл", "сталь", "заготовка"], true),
  p("machined", "Machined part", "Обработанная деталь", "Metal", "cylinder", [0.26, 0.17, 0.26], 0xa3b3c2, 1.8, ["metal", "cnc", "part", "finished", "металл", "деталь", "обработка"], true),
  p("gear", "Steel gear", "Стальная шестерня", "Metal", "gear", [0.28, 0.08, 0.28], 0x8a9cac, 0.8, ["metal", "gear", "automotive", "steel", "металл", "шестерня", "авто"], true),
  p("sheet", "Sheet metal blank", "Листовая заготовка", "Metal", "board", [0.3, 0.035, 0.28], 0x8f9ba8, 0.9, ["metal", "press", "sheet", "raw", "металл", "лист", "пресс"], true),
  p("stamped", "Stamped housing", "Штампованный корпус", "Metal", "frame", [0.29, 0.14, 0.25], 0xa1adba, 0.7, ["metal", "press", "housing", "металл", "корпус", "штамповка"], true),
  p("welded", "Welded frame", "Сварная рама", "Metal", "frame", [0.3, 0.22, 0.28], 0x667a8e, 1.6, ["metal", "weld", "frame", "металл", "сварка", "рама"], true),
  p("pcb", "Circuit board", "Печатная плата", "Electronics", "board", [0.28, 0.04, 0.22], 0x328d65, 0.15, ["pcb", "electronics", "board", "raw", "электроника", "плата"]),
  p("phone", "Assembled device", "Собранное устройство", "Electronics", "board", [0.25, 0.06, 0.16], 0x364c68, 0.22, ["phone", "electronics", "device", "finished", "электроника", "телефон", "устройство"]),
  p("battery", "Battery cell", "Аккумулятор", "Electronics", "cylinder", [0.12, 0.23, 0.12], 0x578bbe, 0.3, ["battery", "electronics", "energy", "электроника", "батарея", "аккумулятор"]),
  p("vial", "Empty medical vial", "Пустой медицинский флакон", "Medical", "bottle", [0.12, 0.22, 0.12], 0xc0dfe3, 0.04, ["medical", "pharma", "vial", "empty", "медицина", "флакон", "фарма"]),
  p("medicine", "Filled medical vial", "Заполненный флакон", "Medical", "bottle", [0.12, 0.22, 0.12], 0x75c9bd, 0.1, ["medical", "pharma", "medicine", "filled", "медицина", "лекарство", "флакон"]),
  p("soap", "Soap bar", "Кусок мыла", "Consumer", "box", [0.22, 0.08, 0.15], 0xcda4d6, 0.1, ["soap", "consumer", "cosmetics", "мыло", "косметика"]),
  p("toy", "Toy block", "Игрушечный кубик", "Consumer", "box", [0.2, 0.2, 0.2], 0xe8b83a, 0.16, ["toy", "plastic", "consumer", "игрушка", "кубик", "пластик"]),
  p("wheel", "Rubber wheel", "Резиновое колесо", "Automotive", "gear", [0.3, 0.12, 0.3], 0x353b42, 0.7, ["automotive", "rubber", "wheel", "авто", "резина", "колесо"]),
  p("clay", "Clay brick blank", "Глиняная заготовка кирпича", "Bricks", "box", [0.3, 0.14, 0.16], 0x9b6045, 1.8, ["brick", "clay", "raw", "кирпич", "глина", "заготовка"]),
  p("brick", "Fired brick", "Обожженный кирпич", "Bricks", "box", [0.29, 0.14, 0.15], 0xb85d3e, 1.7, ["brick", "fired", "ceramic", "кирпич", "керамика", "готовое"]),
  p("brick-pack", "Brick pack", "Упаковка кирпичей", "Bricks", "box", [0.34, 0.18, 0.24], 0xcb7049, 3.4, ["brick", "pack", "pallet", "кирпич", "упаковка", "паллет"]),
  p("glass", "Glass panel", "Стеклянная панель", "Construction", "board", [0.34, 0.04, 0.26], 0x82bbc5, 1.1, ["glass", "window", "construction", "стекло", "окно", "строительство"]),
  p("window", "Assembled window", "Собранное окно", "Construction", "frame", [0.34, 0.2, 0.3], 0xa8c4cc, 2.0, ["window", "frame", "assembly", "окно", "рама", "сборка"]),
  p("engine", "Engine block", "Блок двигателя", "Automotive", "box", [0.32, 0.2, 0.26], 0x697986, 8.2, ["engine", "automotive", "assembly", "двигатель", "авто", "сборка"], true),
  p("painted", "Painted housing", "Окрашенный корпус", "Paint", "frame", [0.29, 0.15, 0.25], 0xd6534c, 0.9, ["paint", "painted", "coated", "краска", "окрашенный", "корпус"]),
  p("chair", "Wooden chair", "Деревянный стул", "Assembly", "frame", [0.3, 0.25, 0.3], 0x9a7044, 3.5, ["chair", "wood", "assembly", "стул", "дерево", "сборка"]),
  p("weldment", "Weldment frame", "Сварная рама", "Assembly", "frame", [0.34, 0.2, 0.28], 0x727f88, 4.1, ["frame", "weld", "assembly", "рама", "сварка", "сборка"], true),
];

export const getProduct = (id: unknown): Product => PRODUCTS.find((product) => product.id === id) ?? PRODUCTS[0];
export const MACHINE_KINDS = new Set(["cnc", "press", "weld", "packaging", "paint", "cutter", "inspection", "assembly", "kiln", "lathe", "grinder"]);
export function searchProducts(query: string, category = "All") {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return PRODUCTS.filter((product) => (category === "All" || product.category === category) && tokens.every((token) =>
    `${product.name} ${product.ru} ${product.category} ${product.tags.join(" ")}`.toLocaleLowerCase().includes(token)));
}

export function palletSize(props: Record<string, string | number | boolean>): [number, number] {
  const product = getProduct(props.product);
  const gap = Number(props.gap ?? 0.04);
  return [Math.max(1.2, Number(props.cols ?? 3) * (product.size[0] + gap) + 0.04), Math.max(0.8, Number(props.rows ?? 2) * (product.size[2] + gap) + 0.04)];
}