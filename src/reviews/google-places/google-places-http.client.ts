import { GooglePlaceDetails, GooglePlacesClient } from './google-places.client';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places';
const REQUEST_TIMEOUT_MS = 5000;
// Google bills Place Details by the fields requested, so ask only for these.
const FIELD_MASK = 'googleMapsUri,reviews';
const REVIEWS_LANGUAGE_CODE = 'pt-BR';

export class GooglePlacesHttpClient extends GooglePlacesClient {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly placeId: string | undefined,
  ) {
    super();
  }

  async fetchPlaceDetails(): Promise<GooglePlaceDetails> {
    if (!this.apiKey || !this.placeId) {
      throw new Error('GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID must be set');
    }

    const response = await fetch(
      `${PLACES_API_URL}/${this.placeId}?languageCode=${REVIEWS_LANGUAGE_CODE}`,
      {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(`Google Places API responded with ${response.status}`);
    }

    return (await response.json()) as GooglePlaceDetails;
  }
}
