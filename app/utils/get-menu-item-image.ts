import { type ImageSourcePropType } from "react-native";
import { optimizedMenuImageAssets } from "./generated-menu-optimized-assets";

const menuImageFiles: Record<string, string> = {
  "Fish Fry (1pc Bhola Bhetki)": "Fish Fry.jpg",
  "Fish Finger 8pcs": "Fish-Fingers.jpg",
  "Chicken Pakoda 8pcs": "chicken Pakoda.png",
  "Chicken Lollipop 8pcs": "chicken 65_69.jpg",
  "Chicken 65/69 8pc": "chicken 65_69.jpg",
  "Liver Fry 250gm": "liver_fry.jpg",
  "Egg Bhujiya": "Egg-Bhurji.jpg",
  "Chicken Cutlet 2pcs": "chicken cutlet.jpg",
  "Chicken Finger 8pcs": "chicken finger.jpg",
  "Litti Murga": "litti murga.jpg",
  "Mutton Litti": "Mutton_Litti.jpg",
  "Paneer Pakoda 8pcs": "paneer-pakoda.jpg",
  "Paneer Pasanda 4pcs": "paneer-pasanda.jpg",
  "Dry Chilli Veg Ball 8pcs": "veg-Ball.webp",
  "Masala Papad": "Masala-papad.jpg",
  "Peanut Masala": "chana-masala (1).jpg",
  "Mushroom Fry 8pcs": "mushroom-fry.jpg",
  "French Fries": "French-Fries.jpg",
  "Paneer Bhujia": "Panner-Bhujiya.jpg",
  "Veg Cutlet 2pcs": "Veg-Cutlet.jpg",
  "Litti Chokha 2pcs": "Litti-chokha.webp",
  "Green Salad": "Green-Salad.jpg",
  "Egg Handi Biryani": "Egg_Handi_B.jpg",
  "Chicken Handi Biryani": "chicken-handi-biryani.jpg",
  "Mutton Handi Biryani": "mutton_Handi_B.jpg",
  "Special Family Pack Biryani": "Family_pack_Birayni.avif",
  "Chicken Tangri Kebab 2pcs": "Tangdi-kebab.webp",
  "Chicken Tikka Kebab 8pcs": "Chicken tikka Kebab.jpg",
  "Chicken Reshmi Kebab 8pcs": "Reshmi Kabab.jpeg",
  "Paneer Tikka 8pcs": "paneer-tikka.jpg",
  "Chicken Malai Kebab 8pcs": "Chicken-Malai.jpg",
  "Chicken Cheese Kebab 8pcs": "chicken Cheese.jpg",
  "Half Chicken Tandoori 500gm": "Tandoori-Chicken.jpg",
  "Full Chicken Tandoori 1kg": "Tandoori-Chicken.jpg",
  "Veg Noodles": "veg-nodd.jpg",
  "Egg Noodles": "Egg-Fried-Noodles.webp",
  "Chicken Noodles": "chicken-noodles.jpg",
  "Egg Chicken Noodles": "Egg-Chicken_Nodd.jpg",
  "Mushroom Noodles": "Mushroom-Noodle.webp",
  "Paneer Noodles": "Panner-noddles.jpeg",
  "Prawn Noodles": "Prawn-Noddle.jpg",
  "Mixed Noodles (Prawn+Egg+Chicken)": "Mixed Noddles.webp",
  "Schezwan Veg Noodles": "Schezwan-Noodles-.webp",
  "Schezwan Egg Noodles": "Schezwan-Noodles-Egg.webp",
  "Schezwan Chicken Noodles": "Schezwan-Noodles-chicken.jpeg",
  "Schezwan Egg Chicken Noodles": "Schezwan-Noodles-Egg+C.jpeg",
  "Schezwan Mushroom Noodles": "Schezwan-Noodles-mushroom.jpeg",
  "Schezwan Paneer Noodles": "Schezwan-Noodles-panner.jpeg",
  "Schezwan Prawn Noodles": "Schezwan-Noodles-Prawn.jpeg",
  "Schezwan Mixed Noodles": "Schezwan-Mixed -Noodles.jpeg",
  "Double Egg Roll": "egg-roll.jpg",
  "Chicken Roll": "chicken Roll.jpg",
  "Mushroom Roll": "Mushroom Roll.jpg",
  "Paneer Roll": "panner-Roll.jpeg",
  "Egg Chicken Roll": "Egg Chicken roll.jpg",
  "Double Egg Chicken Roll": "D-egg-Chi-Roll.jpg",
  "Kebab Roll": "Kabab-Roll.jpg",
  "Chilli Chicken 8pcs": "Chilli-Chicken.jpg",
  "Chicken Schezwan 6pcs": "chicken schezwan.webp",
  "Veg Manchurian 8pcs": "Veg_manchuriyan.jpg",
  "Baby Corn Chilli 500ml": "Baby-corn-chili.jpg",
  "Baby Corn Manchurian 500ml": "Baby-Corn-Manchurian.jpg",
  "Paneer Chilli 6pcs": "chilli-paneer.jpg",
  "Paneer Manchurian 8pcs": "paneer-manchurian.jpg",
  "Garlic Paneer 8pcs": "Garlic-Panner.jpg",
  "Mushroom Chilli": "chilli-mushroom.jpg",
  "Mushroom Manchurian 500ml": "mushroom_manchurian.avif",
  "Basmati Rice 750ml": "plain rice Basmati .jpg",
  "Jeera Rice": "jeera rice.jpeg",
  "Kashmari Pulao": "Kashmiri-Pulao.jpg",
  "Veg Fried Rice": "veg-fried-rice.jpg",
  "Egg Fried Rice": "Egg Fried RICE.jpg",
  "Chicken Fried Rice": "Chicken-Fried Rice.jpeg",
  "Egg Chicken Fried Rice": "Egg Fried RICE.jpg",
  "Mushroom Fried Rice": "Mushroom fried rice.jpeg",
  "Paneer Fried Rice": "paneer-fried-rice.webp",
  "Prawn Fried Rice": "prawn-fried-rice.webp",
  "Mixed Fried Rice": "Mixed-Fried-Rice.webp",
  "Schezwan Veg Fried Rice": "Schezwan veg fried rice.webp",
  "Schezwan Egg Fried Rice": "Schezwan-Egg-Fried-Rice-.jpg",
  "Schezwan Chicken Fried Rice": "Schezwan Chicken Fried Rice.jpg",
  "Handi Mutton": "Handi Mutton.jpg",
  "Handi Chicken": "Handi-Chicken.png",
  "Double Egg Curry": "Double-egg-Curry.webp",
  "Egg Tadka 500ml": "Egg-Tadka.jpg",
  "Handi Mutton 250gm": "Handi Mutton.jpg",
  "Chicken Tadka": "Chicken tadka.jpg",
  "Egg Chicken Tadka": "Egg Chicken tadka.jpg",
  "Handi Chicken 250gm": "Handi-Chicken.png",
  "Chicken Do Piyaza": "Chicken Do Pyaza.jpg",
  "Kadhai Chicken": "Kadai-Chicken.jpg",
  "Chicken Black Pepper": "chicken black pepper.webp",
  "Dhinya Chicken": "Dhaniya chicken.webp",
  "Chicken Bharta 250gm": "Chicken-Bharta.jpg",
  "Chicken Butter Masala": "Chicken Butter Masala.avif",
  "Chicken Tikka Butter Masala": "Chicken Tikka Butter Masala.jpg",
  "Chicken Afghani": "chicken Afghani.jpg",
  "Chicken Korma": "chicken-korma.jpg",
  "Chicken Schezwan": "chicken schezwan.webp",
  "Chingari Malai Curry 5pc": "chicken malai curry.jpg",
  "Crispy Alu Bhaja": "aloo-bhaja.jpg",
  "Kishmari Alu Dum 6pcs": "Kashmiri-Dum-Aloo.jpg",
  "Dal Tadka 500ml": "Dal-Tadka.jpg",
  "Butter Dal Fry": "Dal-Tadka-Butter.jpg",
  "Chana Masala 500ml": "chana-masala.jpg",
  "Mixed Veg": "mixed-veg.jpg",
  "Paneer Do Pyaza 6pcs": "paneer-do-pyaza.jpg",
  "Kadhai Paneer 8pcs": "kadai-paneer.jpg",
  "Paneer Kashmiri 8pcs": "Paneer-Masala.jpg",
  "Matar Paneer 8pcs": "Matar panner Masala combo.avif",
  "Paneer Butter Masala 8pcs": "paneer-butter-masala.jpg",
  "Palak Paneer 8pcs": "palak-Panner.jpeg",
  "Paneer Bharta": "panner-Bharta.jpg",
  "Mushroom Masala": "Matar-Mashroom-Masala.jpeg",
  "Mushroom Butter Masala": "Mushroom Butter-M.jpg",
  "Kadhai Mushroom": "kadai-mushroom-recipe.jpg",
  "Mushroom Do Piyaza": "Mush-Do-P.jpeg",
  "Matar Mushroom Masala": "mutter-mushroom.jpg",
  "Paneer Malai Kofta 4pcs": "Panner-Malai-Kofta.jpg",
  "Gatte Ki Sabji 8pcs": "gatte-Ki-Sabji.jpg",
  "Curry Chawal": "Curry-chawal.jpg",
  "Rajma Chawal": "rajma-chawal.jpg",
  "Regular Veg Thali": "Veg-Thali.jpg",
  "Regular Paneer/Mushroom Thali": "mushroom-thali.jpg",
  "Regular Egg Thali": "Egg-thali.jpeg",
  "Regular Fish Thali": "Fish Thali.webp",
  "Regular Chicken Thali": "Chicken-thali.jpeg",
  "Regular Mutton Thali": "mutton-thali.avif",
  "Regular Pabda Thali": "Pabda-Thali.jpeg",
  "Regular Prawn Thali": "prawn-thali.jpg",
  "Lachha Paratha": "Lachha-Paratha.jpg",
  "Alu Paratha 2pcs": "aloo-Paratha.avif",
  "Paneer Paratha 2pcs": "panner-paratha.jpg",
  "Tawa Roti": "tawa-roti.jpeg",
  "Butter Roti": "Butter-Roti.jpeg",
  "Tandoori Roti": "Tandoori-Roti.jpeg",
  "Butter Tandoori Roti": "Butter-Tandori-Roti.png",
  "Plain Nan": "plain-naan.jpeg",
  "Butter Nan": "Butter-Naan.jpeg",
  "Garlic Nan": "Garlic_Naan-.jpg",
  "Masala Kulcha": "Masala-Kulcha.webp",
  "Atta Tandoori Roti": "Atta-tandoori-Roti.jpg",
  "Atta Laccha Paratha": "atta-Laccha-paratha.jpeg",
  "Dal Tadka Combo": "Dal-Tadka-combo.jpg",
  "Yellow Dal Fry Combo": "Yellow Dal Fry Combo.jpg",
  "Egg Tadka Combo": "Egg-Tadka-Combo.jpeg",
  "Alu Dum Combo": "Aloo Dum Combo.jpg",
  "Dhaniya/Rezala Chicken Combo": "Dhaniya_Rezala Chicken Combo.jpg",
  "Handi Mutton Combo": "Handi-Mutton-Combo.jpeg",
  "Prawn Masala Combo": "prawn masala combo.jpg",
  "Fish Combo": "Fish-Combo.jpeg",
  "Handi Chicken Combo": "Handi-Chicken.png",
  "Afghani Chicken Combo": "afghani-chicken-Combo.jpg",
  "Chicken Corma Combo": "Chicken-Korma-combo.webp",
  "Handi Paneer Masala Combo": "handi paneer masala combo.png",
  "Butter Paneer Masala Combo": "panner-butter-combo.webp",
  "Matar Paneer Masala Combo": "Matar panner Masala combo.avif",
  "Chicken Butter Masala Combo": "Chicken butter masala combo.jpg",
  "Chilli Chicken Combo": "CHILI-chicken-combo.jpg",
  "Chicken Bharta Combo": "Chicken-Bharta-Combo.jpeg",
  "Noodles Combo (Chilli Chicken)": "CHILI-chicken-combo.jpg",
  "Noodles Combo (Chilli Paneer)": "Noodles combo(chili Panner).png",
  "Fried Rice Combo (Chilli Paneer)": "Fried rice combo(Chili Panner).png",
  "Chilli Paneer Combo (Paratha)": "Chili Panner Combo(Paratha).png",
  "Veg Manchurian Combo": "Veg manchurian Combo.jpg",
  "Palak Paneer Masala Combo": "palak_panner masal combo.jpg",
};

const fallbackImage = require("../assets/images/logo.jpeg");
function toLocalImage(fileName = ""): ImageSourcePropType {
  const cleanFileName = String(fileName).trim();
  if (!cleanFileName) return fallbackImage;

  return optimizedMenuImageAssets[cleanFileName] ?? fallbackImage;
}

const normalizeName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[()/_+.-]+/g, " ")
    .replace(/\b(pcs?|pc|gm|kg|ml|regular|half|full)\b/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\b(corma|korma)\b/g, "korma")
    .replace(/\b(kadhai|kadai)\b/g, "kadai")
    .replace(/\b(piyaza|pyaza)\b/g, "pyaza")
    .replace(/\b(alu|aloo)\b/g, "aloo")
    .replace(/\b(nan)\b/g, "naan")
    .replace(/\b(panner)\b/g, "paneer")
    .replace(/\b(dhinya)\b/g, "dhaniya")
    .replace(/\s+/g, " ")
    .trim();

const menuImages = Object.fromEntries(
  Object.entries(menuImageFiles).map(([menuItem, fileName]) => [menuItem, toLocalImage(fileName)]),
);

const normalizedMenuImages = Object.fromEntries(
  Object.entries(menuImages).map(([menuItem, imageSource]) => [normalizeName(menuItem), imageSource]),
);

function getCategoryFallback(category = ""): ImageSourcePropType {
  const normalizedCategory = normalizeName(category);
  if (normalizedCategory.includes("thali")) return toLocalImage("Veg-Thali.jpg");
  if (normalizedCategory.includes("biryani")) return toLocalImage("chicken-handi-biryani.jpg");
  if (normalizedCategory.includes("noodles")) return toLocalImage("Mixed Noddles.webp");
  if (normalizedCategory.includes("rice")) return toLocalImage("Mixed-Fried-Rice.webp");
  if (normalizedCategory.includes("tandoor")) return toLocalImage("Tandoori-Chicken.jpg");
  if (normalizedCategory.includes("roll")) return toLocalImage("chicken Roll.jpg");
  if (normalizedCategory.includes("combo")) return toLocalImage("Dal-Tadka-combo.jpg");
  return toLocalImage("Veg-Thali.jpg");
}

function getImageByBackendPath(backendImage = ""): ImageSourcePropType | null {
  if (!backendImage) return null;

  const fileName = decodeURIComponent(
    String(backendImage)
      .trim()
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .pop() || "",
  );
  if (!fileName) return null;

  return optimizedMenuImageAssets[fileName] ?? null;
}

export function getMenuItemImage(itemName = "", category = "", backendImage = ""): ImageSourcePropType {
  if (menuImages[itemName]) return menuImages[itemName];

  const normalizedName = normalizeName(itemName);
  if (normalizedMenuImages[normalizedName]) return normalizedMenuImages[normalizedName];

  const backendMappedImage = getImageByBackendPath(backendImage);
  if (backendMappedImage) return backendMappedImage;

  return getCategoryFallback(category);
}

export function getMenuImageByFileName(fileName: string): ImageSourcePropType {
  return toLocalImage(fileName);
}
