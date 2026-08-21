/**
 * Föreslår ett Elevante-konto för ett lärarnamn ur schemat.
 *
 * Royal Schedules filexport ger bara förnamn ("Alfred", "Anna"), så
 * mappningen till konto måste göras av adminen. Det här är hjälpen på
 * vägen — men bara när träffen är ENTYDIG. Två lärare som heter Anna ska
 * ge noll förslag, aldrig ett godtyckligt av dem: ett tyst felkopplat
 * konto skickar en lärares lektioner till fel person.
 *
 * Ren funktion, medvetet utanför `lib/data/` — den har inget behov av
 * databasen och ska gå att testa utan den.
 */

export type TeacherOption = {
  id: string;
  name: string;
};

export function suggestProfileForName(
  displayName: string,
  options: TeacherOption[],
): string | null {
  const needle = displayName.trim().toLowerCase();
  if (!needle) return null;

  const matches = options.filter((option) => {
    const full = option.name.trim().toLowerCase();
    if (full === needle) return true;
    // Bara förnamnet — ett efternamn som råkar matcha är en gissning för
    // mycket, schemat skriver aldrig efternamn ensamt.
    return full.split(/\s+/)[0] === needle;
  });

  return matches.length === 1 ? matches[0]!.id : null;
}
