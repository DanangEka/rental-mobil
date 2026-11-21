import records from "./bali.json";
import { buildRegionalGuides } from "./buildGuide";

const baliGuides = buildRegionalGuides(records);
export default baliGuides;
