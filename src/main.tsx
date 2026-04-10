/**
 * main.tsx — Invoice Adda Entry Point
 *
 * This is the very first file that runs when the app starts.
 * It mounts the React <App /> component into the #root <div> in index.html.
 * Also imports global CSS (index.css) which defines all CSS variables, theme tokens,
 * sidebar styles, and Tailwind base styles.
 */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Initializing React app..."); // Added logging to confirm initialization

createRoot(document.getElementById("root")!).render(<App />);

console.log("React app rendered successfully."); // Added logging to confirm rendering
