/** Iran's 31 provinces. The Persian name is what gets stored with an order. */
export const PROVINCES: readonly { fa: string; en: string }[] = [
  { fa: "آذربایجان شرقی", en: "East Azerbaijan" },
  { fa: "آذربایجان غربی", en: "West Azerbaijan" },
  { fa: "اردبیل", en: "Ardabil" },
  { fa: "اصفهان", en: "Isfahan" },
  { fa: "البرز", en: "Alborz" },
  { fa: "ایلام", en: "Ilam" },
  { fa: "بوشهر", en: "Bushehr" },
  { fa: "تهران", en: "Tehran" },
  { fa: "چهارمحال و بختیاری", en: "Chaharmahal and Bakhtiari" },
  { fa: "خراسان جنوبی", en: "South Khorasan" },
  { fa: "خراسان رضوی", en: "Razavi Khorasan" },
  { fa: "خراسان شمالی", en: "North Khorasan" },
  { fa: "خوزستان", en: "Khuzestan" },
  { fa: "زنجان", en: "Zanjan" },
  { fa: "سمنان", en: "Semnan" },
  { fa: "سیستان و بلوچستان", en: "Sistan and Baluchestan" },
  { fa: "فارس", en: "Fars" },
  { fa: "قزوین", en: "Qazvin" },
  { fa: "قم", en: "Qom" },
  { fa: "کردستان", en: "Kurdistan" },
  { fa: "کرمان", en: "Kerman" },
  { fa: "کرمانشاه", en: "Kermanshah" },
  { fa: "کهگیلویه و بویراحمد", en: "Kohgiluyeh and Boyer-Ahmad" },
  { fa: "گلستان", en: "Golestan" },
  { fa: "گیلان", en: "Gilan" },
  { fa: "لرستان", en: "Lorestan" },
  { fa: "مازندران", en: "Mazandaran" },
  { fa: "مرکزی", en: "Markazi" },
  { fa: "هرمزگان", en: "Hormozgan" },
  { fa: "همدان", en: "Hamadan" },
  { fa: "یزد", en: "Yazd" },
];

export function isProvince(value: string): boolean {
  return PROVINCES.some((province) => province.fa === value);
}

export const ORDER_SIZES = [36, 38, 40, 42, 44, 46] as const;
