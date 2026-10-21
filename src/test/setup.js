import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem isto, uma tela renderizada num teste continua no DOM do seguinte e as
// consultas por texto encontram dois elementos.
afterEach(cleanup);
