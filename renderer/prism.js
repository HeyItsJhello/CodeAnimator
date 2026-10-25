// prismjs language components register themselves on a global `Prism`.
// Exposing prism-react-renderer's instance here (evaluated before those
// imports in syntax.js) makes them extend the instance <Highlight> uses.
import { Prism } from 'prism-react-renderer';

globalThis.Prism = Prism;

export { Prism };
