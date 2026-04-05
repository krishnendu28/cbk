export const menuImages = {
  "Fish Fry (1pc Bhola Bhetki)": "https://images.pexels.com/photos/8969237/pexels-photo-8969237.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Fish Finger 8pcs": "https://images.pexels.com/photos/1580474/pexels-photo-1580474.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Chicken Pakoda 8pcs": "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Chicken Lollipop 8pcs": "https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Egg Handi Biryani": "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Chicken Handi Biryani": "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Mutton Handi Biryani": "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Chicken Tangri Kebab 2pcs": "https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Paneer Tikka 8pcs": "https://images.pexels.com/photos/9609843/pexels-photo-9609843.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Veg Noodles": "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Chicken Roll": "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  "Dal Tadka Combo": "https://images.pexels.com/photos/9609845/pexels-photo-9609845.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
};

export function getFoodImage(itemName = "", category = "") {
  if (menuImages[itemName]) return menuImages[itemName];

  const name = itemName.toLowerCase();
  if (name.includes("fish fry")) return "https://images.pexels.com/photos/8969237/pexels-photo-8969237.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("fish")) return "https://images.pexels.com/photos/1580474/pexels-photo-1580474.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("biryani")) return "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("kebab") || name.includes("tikka") || name.includes("tangri") || name.includes("reshmi") || name.includes("malai")) return "https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("tandoori")) return "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("noodles") || name.includes("noodle")) return "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("fried rice")) return "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("rice") || name.includes("pulao")) return "https://images.pexels.com/photos/1640771/pexels-photo-1640771.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("roll")) return "https://images.pexels.com/photos/9609851/pexels-photo-9609851.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("manchurian") || name.includes("chilli")) return "https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("mutton")) return "https://images.pexels.com/photos/6210747/pexels-photo-6210747.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("chicken")) return "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("egg")) return "https://images.pexels.com/photos/9609849/pexels-photo-9609849.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("paneer")) return "https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("mushroom")) return "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("dal") || name.includes("chana")) return "https://images.pexels.com/photos/9609845/pexels-photo-9609845.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("roti") || name.includes("paratha") || name.includes("naan") || name.includes("nan") || name.includes("kulcha")) return "https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("thali")) return "https://images.pexels.com/photos/9609838/pexels-photo-9609838.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("salad")) return "https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (name.includes("fries") || name.includes("fry")) return "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";

  const normalizedCategory = String(category || "").toLowerCase();
  if (normalizedCategory.includes("thali")) return "https://images.pexels.com/photos/9609838/pexels-photo-9609838.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (normalizedCategory.includes("biryani")) return "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  if (normalizedCategory.includes("veg")) return "https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";

  return "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
}
