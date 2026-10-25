import { GooglePlaceDetails, GooglePlacesClient } from './google-places.client';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places';
const REQUEST_TIMEOUT_MS = 5000;
// Google bills Place Details by the fields requested, so ask only for these.
const FIELD_MASK = 'googleMapsUri,reviews';
const REVIEWS_LANGUAGE_CODE = 'pt-BR';

// Error body of Google APIs, such as { error: { status: 'PERMISSION_DENIED',
// message: 'Billing is not enabled...' } }. It never echoes the API key.
interface GoogleErrorBody {
  error?: { status?: string; message?: string };
}

// The reason tells a disabled billing apart from a restricted key or a
// disabled API, which all come as 403.
async function readErrorReason(response: Response): Promise<string> {
  try {
    const { error } = (await response.json()) as GoogleErrorBody;
    const reason = [error?.status, error?.message].filter(Boolean).join(': ');
    return reason ? ` (${reason})` : '';
  } catch {
    return '';
  }
}

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
      throw new Error(
        `Google Places API responded with ${response.status}${await readErrorReason(response)}`,
      );
    }

    return (await response.json()) as GooglePlaceDetails;
  }
}
