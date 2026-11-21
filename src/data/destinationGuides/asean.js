import records from "./asean.json";
import { buildRegionalGuides } from "./buildGuide";

const aseanGuides = buildRegionalGuides(records);
export default aseanGuides;
