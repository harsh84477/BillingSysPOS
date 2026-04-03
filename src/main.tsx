import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Initializing React app..."); // Added logging to confirm initialization

createRoot(document.getElementById("root")!).render(<App />);

console.log("React app rendered successfully."); // Added logging to confirm rendering
