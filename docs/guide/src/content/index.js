import { part0 } from './00-orientation.js';
import { part1 } from './01-build.js';
import { part2 } from './02-diagnosis.js';
import { part3 } from './03-ppm.js';
import { part4 } from './04-mastering.js';
import { part5 } from './05-report.js';
import { part6 } from './06-sources.js';
import { part7 } from './07-prompt.js';

export const parts = [part0, part1, part2, part3, part4, part5, part6, part7];

export const meta = {
  docTitle: {
    en: 'Decorative Brick Factory in Visual Components 4.8 — complete build & service guide',
    ru: 'Завод декоративного кирпича в Visual Components 4.8 — полное руководство по моделированию и ТО',
  },
  title: {
    en: 'Decorative Brick Factory · Visual Components 4.8',
    ru: 'Завод декоративного кирпича · Visual Components 4.8',
  },
  subtitle: {
    en: 'FANUC LR Mate 200iD/7L · R-30iB Plus · Pick and Place palletizing cell',
    ru: 'FANUC LR Mate 200iD/7L · R-30iB Plus · ячейка Pick and Place (паллетирование)',
  },
  hero: {
    image: 'assets/media/cell-hero.jpg',
    kicker: {
      en: 'Complete practical guide · build + service + paperwork',
      ru: 'Полное практическое руководство · модель + диагностика + документы',
    },
    title: {
      en: 'Build a decorative brick factory in Visual Components 4.8 — and service its FANUC robot by the book',
      ru: 'Постройте завод декоративного кирпича в Visual Components 4.8 — и обслужите его робот FANUC по регламенту',
    },
    text: {
      en: 'Part 1 is a click-by-click layout build of the palletizing cell with a FANUC LR Mate 200iD/7L. Parts 2–5 solve the service task: INTP-106 diagnostics, J5 belt tension measurement with real FANUC parameters, a 6-month maintenance programme, mastering recovery after a lost battery swap, and the claim paperwork. Every number is traceable to an official FANUC or Visual Components document listed in Part 6.',
      ru: 'Часть 1 — пошаговая сборка ячейки паллетирования с FANUC LR Mate 200iD/7L. Части 2–5 решают сервисную задачу: диагностика INTP-106, измерение натяжения ремня J5 с реальными параметрами FANUC, график ППР на 6 месяцев, восстановление мастерения после обесточивания при замене батареи и рекламационные документы. Каждое число имеет ссылку на официальный документ FANUC или Visual Components в части 6.',
    },
    chips: {
      en: ['Visual Components 4.8', 'FANUC LR Mate 200iD/7L', 'R-30iB Plus', 'Pick & Place → pallet', 'INTP-106', 'J5 belt 15.6–20.6 N', '6-month ППР', 'Mastering recovery'],
      ru: ['Visual Components 4.8', 'FANUC LR Mate 200iD/7L', 'R-30iB Plus', 'Pick & Place → паллета', 'INTP-106', 'Ремень J5 15.6–20.6 Н', 'ППР на 6 месяцев', 'Восстановление мастерения'],
    },
  },
  navFoot: {
    en: 'Press <kbd>/</kbd> to search, <kbd>Esc</kbd> to close overlays. Use the print button to export a clean PDF — the stylesheet hides the chrome and expands code blocks.',
    ru: 'Нажмите <kbd>/</kbd> для поиска, <kbd>Esc</kbd> — закрыть окно. Кнопка печати делает аккуратный PDF: интерфейс скрывается, блоки кода разворачиваются.',
  },
  pageFoot: {
    en: `
<p><strong>Scope and liability.</strong> This guide is teaching material. Robot servicing — opening covers, releasing brakes, replacing belts, batteries or reducers, and any mastering operation — may only be performed by trained maintenance personnel under the site's risk assessment and lock-out/tag-out procedure, in accordance with the FANUC Robot Safety Handbook (B-80687EN), the applicable operator's and maintenance manuals for <em>your exact</em> mechanical-unit specification number and controller software version, and ISO 10218-1/-2.</p>
<p>Values quoted here were taken from the published FANUC documents listed in Part 6. FANUC revises manuals and specifications; always confirm a number against the revision that came with your robot before you act on it. Visual Components is a trademark of Visual Components Oy; FANUC, LR Mate, R-30iB Plus, ROBOGUIDE and PalletTool are trademarks of FANUC Corporation. This guide is not affiliated with, or endorsed by, either company.</p>
<p>Built as a static site — no build step, no network calls. Open <code>docs/guide/index.html</code> directly, or serve the folder. Both languages ship in the same bundle; the switch is instant and remembered.</p>`,
    ru: `
<p><strong>Область применения и ответственность.</strong> Это учебный материал. Обслуживание робота — снятие крышек, снятие с тормозов, замена ремней, батарей или редукторов, любые операции мастерения — выполняют только обученные специалисты по результатам оценки рисков и процедуре блокировки (LOTO), в соответствии с FANUC Robot Safety Handbook (B-80687EN), действующими руководствами по эксплуатации и обслуживанию <em>именно вашей</em> спецификации механической части и версии ПО контроллера, а также ISO 10218-1/-2.</p>
<p>Приведённые значения взяты из опубликованных документов FANUC, перечисленных в части 6. FANUC пересматривает руководства и спецификации — перед работой всегда сверяйте число с той редакцией, которая поставлена с вашим роботом. Visual Components — товарный знак Visual Components Oy; FANUC, LR Mate, R-30iB Plus, ROBOGUIDE и PalletTool — товарные знаки FANUC Corporation. Руководство не связано с этими компаниями и ими не одобрено.</p>
<p>Сайт статический: без сборки и сетевых запросов. Откройте <code>docs/guide/index.html</code> напрямую или раздайте папку по HTTP. Оба языка в одном пакете, переключение мгновенное и запоминается.</p>`,
  },
};
