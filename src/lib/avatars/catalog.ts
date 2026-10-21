export type AvatarItem = { id: string; name: string };
export type AvatarGroup = { group: string; items: AvatarItem[]; transparent?: boolean };

export const avatarUrl = (id: string): string => `/avatars/${id}.webp`;

export const AVATAR_CATALOG: AvatarGroup[] = [
  {
    group: "People",
    transparent: true,
    items: [
      { id: "argus_person_01", name: "Person 1" },
      { id: "argus_person_02", name: "Person 2" },
      { id: "argus_person_03", name: "Person 3" },
      { id: "argus_person_04", name: "Person 4" },
      { id: "argus_person_05", name: "Person 5" },
      { id: "argus_person_06", name: "Person 6" },
      { id: "argus_person_07", name: "Person 7" },
      { id: "argus_person_08", name: "Person 8" },
      { id: "argus_person_09", name: "Person 9" },
      { id: "argus_person_10", name: "Person 10" },
      { id: "argus_person_11", name: "Person 11" },
      { id: "argus_person_12", name: "Person 12" },
      { id: "argus_person_13", name: "Person 13" },
      { id: "argus_person_14", name: "Person 14" },
      { id: "argus_person_15", name: "Person 15" },
      { id: "argus_person_16", name: "Person 16" },
      { id: "argus_person_17", name: "Person 17" },
    ],
  },
  {
    group: "Face",
    items: [
      { id: "argus_face_01", name: "Red" },
      { id: "argus_face_02", name: "Orange" },
      { id: "argus_face_03", name: "Gold" },
      { id: "argus_face_04", name: "Green" },
      { id: "argus_face_05", name: "Teal" },
      { id: "argus_face_06", name: "Blue" },
      { id: "argus_face_07", name: "Indigo" },
      { id: "argus_face_08", name: "Purple" },
      { id: "argus_face_09", name: "Pink" },
      { id: "argus_face_10", name: "Rose" },
      { id: "argus_face_11", name: "Slate" },
      { id: "argus_face_12", name: "Graphite" },
    ],
  },
  {
    group: "Misc",
    items: [
      { id: "argus_misc_01", name: "Dreamer" },
      { id: "argus_misc_02", name: "Rebel" },
      { id: "argus_misc_03", name: "Techie" },
      { id: "argus_misc_04", name: "Zen Master" },
      { id: "argus_misc_05", name: "Ninja" },
      { id: "argus_misc_06", name: "Robot" },
      { id: "argus_misc_08", name: "Wizard" },
    ],
  },
  {
    group: "Animals",
    items: [
      { id: "argus_animal_01", name: "Brave Lion" },
      { id: "argus_animal_02", name: "Cheerful Koala" },
      { id: "argus_animal_04", name: "Curious Raccoon" },
      { id: "argus_animal_05", name: "Friendly Bear" },
      { id: "argus_animal_06", name: "Happy Panda" },
      { id: "argus_animal_07", name: "Magic Unicorn" },
      { id: "argus_animal_08", name: "Mysterious Owl" },
    ],
  },
  {
    group: "Space",
    items: [
      { id: "argus_space_01", name: "Nova" },
      { id: "argus_space_02", name: "Satellite" },
      { id: "argus_space_03", name: "Visitor" },
    ],
  },
  {
    group: "Elements",
    items: [
      { id: "argus_element_01", name: "Earth" },
      { id: "argus_element_02", name: "Fire" },
      { id: "argus_element_03", name: "Electric" },
      { id: "argus_element_04", name: "Water" },
    ],
  },
  {
    group: "Manga",
    items: [
      { id: "eboy_manga_eyes_bw_zoomed", name: "Manga Boy" },
      { id: "egirl_manga_eyes_bw_zoomed_distinct", name: "Manga Girl" },
    ],
  },
  {
    group: "Kawaii",
    items: [
      { id: "argus_kawaii_01", name: "Grumpy" },
      { id: "argus_kawaii_02", name: "Shocked" },
      { id: "argus_kawaii_03", name: "Thinking" },
      { id: "argus_kawaii_04", name: "Kiss" },
      { id: "argus_kawaii_05", name: "Crying" },
      { id: "argus_kawaii_06", name: "Sly" },
      { id: "argus_kawaii_07", name: "Grin" },
      { id: "argus_kawaii_08", name: "Smile" },
      { id: "argus_kawaii_10", name: "Wink" },
    ],
  },
  {
    group: "Cats",
    items: [
      { id: "argus_cat_01", name: "Flash Tabby" },
      { id: "argus_cat_02", name: "Midnight Blep" },
      { id: "argus_cat_03", name: "Cloud Grump" },
      { id: "argus_cat_04", name: "Tiny Headset" },
    ],
  },
];

export const AVATAR_COUNT = AVATAR_CATALOG.reduce((n, g) => n + g.items.length, 0);

const KEPT_URLS = new Set(AVATAR_CATALOG.flatMap((g) => g.items.map((i) => avatarUrl(i.id))));

export function isRemovedBuiltinAvatar(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("/avatars/") && !KEPT_URLS.has(value);
}
