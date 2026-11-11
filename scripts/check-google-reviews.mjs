// Checks the Google credentials against the real Places API (New), the same
// call the /reviews route makes:
//   node --env-file=.env scripts/check-google-reviews.mjs
// It prints what Google answers, or the reason it refuses (billing off, API not
// enabled, restricted key, wrong Place ID). When the Place ID is not found, it
// searches the Eldo by name and prints the Place ID Google knows.

const PLACES_API_URL = 'https://places.googleapis.com/v1';
const COMPANY_QUERY = 'Eldo Pintura Eletrostática Samambaia DF';

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const placeId = process.env.GOOGLE_PLACE_ID;

if (!apiKey) {
  console.error('GOOGLE_PLACES_API_KEY is not set (see the README, "Avaliações do Google").');
  process.exit(1);
}

async function callGoogle(path, { fieldMask, body } = {}) {
  const response = await fetch(`${PLACES_API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

function printError({ status, json }) {
  const { status: reason, message } = json.error ?? {};
  console.error(`Google answered ${status} ${reason ?? ''}: ${message ?? '(no message)'}`);
}

async function searchByName() {
  const result = await callGoogle('/places:searchText', {
    fieldMask: 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
    body: { textQuery: COMPANY_QUERY, languageCode: 'pt-BR' },
  });
  if (!result.ok) return printError(result);
  console.log('\nPlaces Google found by name (use the id as GOOGLE_PLACE_ID):');
  for (const place of result.json.places ?? []) {
    console.log(`- ${place.id}  ${place.displayName?.text}  ${place.formattedAddress}  (${place.rating} de ${place.userRatingCount})`);
  }
}

if (placeId) {
  const result = await callGoogle(`/places/${placeId}?languageCode=pt-BR`, {
    fieldMask: 'displayName,rating,userRatingCount,googleMapsUri,reviews',
  });
  if (result.ok) {
    const { displayName, rating, userRatingCount, googleMapsUri, reviews = [] } = result.json;
    console.log(`${displayName?.text}: ${rating} (${userRatingCount} avaliações) ${googleMapsUri}`);
    console.log(`The route /reviews will show ${reviews.length} review(s):`);
    for (const review of reviews) {
      console.log(`- ${review.rating}★ ${review.authorAttribution?.displayName}: ${(review.text?.text ?? '').slice(0, 80)}`);
    }
    process.exit(0);
  }
  printError(result);
  // Only a Place ID problem is worth a search by name; a bad key or billing is not.
  const isPlaceIdProblem = result.status === 404 || (result.status === 400 && !/API key/i.test(result.json.error?.message ?? ''));
  if (!isPlaceIdProblem) process.exit(1);
} else {
  console.error('GOOGLE_PLACE_ID is not set.');
}

await searchByName();
process.exit(1);
