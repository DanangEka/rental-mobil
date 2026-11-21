import records from "./indonesia.json";
import { buildRegionalGuides } from "./buildGuide";

const indonesiaGuides = buildRegionalGuides(records);
export default indonesiaGuides;
