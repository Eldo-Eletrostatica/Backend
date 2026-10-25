import { GooglePlacesHttpClient } from './google-places-http.client';

describe('GooglePlacesHttpClient', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it.each([
    [undefined, 'place-id'],
    ['api-key', undefined],
    [undefined, undefined],
  ])(
    'fails without calling Google when the key is %p and the place is %p',
    async (apiKey, placeId) => {
      const client = new GooglePlacesHttpClient(apiKey, placeId);

      await expect(client.fetchPlaceDetails()).rejects.toThrow(
        'GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID must be set',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('returns the place details sent by Google, with a timeout on the request', async () => {
    const placeDetails = { googleMapsUri: 'https://maps.google.com/?cid=123' };
    fetchMock.mockResolvedValue(Response.json(placeDetails));
    const client = new GooglePlacesHttpClient('api-key', 'place-id');

    await expect(client.fetchPlaceDetails()).resolves.toEqual(placeDetails);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places/place-id?languageCode=pt-BR',
      expect.objectContaining({
        headers: {
          'X-Goog-Api-Key': 'api-key',
          'X-Goog-FieldMask': 'googleMapsUri,reviews',
        },
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it.each([
    [
      403,
      'PERMISSION_DENIED',
      'Billing is not enabled',
      'Google Places API responded with 403 (PERMISSION_DENIED: Billing is not enabled)',
    ],
    [
      429,
      'RESOURCE_EXHAUSTED',
      'Quota exceeded',
      'Google Places API responded with 429 (RESOURCE_EXHAUSTED: Quota exceeded)',
    ],
    [
      500,
      'INTERNAL',
      'Internal error',
      'Google Places API responded with 500 (INTERNAL: Internal error)',
    ],
  ])(
    'fails with the reason Google gives for a %i (%s)',
    async (status, googleStatus, message, expectedError) => {
      fetchMock.mockResolvedValue(
        Response.json({ error: { status: googleStatus, message } }, { status }),
      );
      const client = new GooglePlacesHttpClient('api-key', 'place-id');

      await expect(client.fetchPlaceDetails()).rejects.toThrow(expectedError);
    },
  );

  it('fails with only the status when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));
    const client = new GooglePlacesHttpClient('api-key', 'place-id');

    await expect(client.fetchPlaceDetails()).rejects.toThrow(
      /^Google Places API responded with 502$/,
    );
  });

  it('fails when the request times out', async () => {
    fetchMock.mockRejectedValue(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );
    const client = new GooglePlacesHttpClient('api-key', 'place-id');

    await expect(client.fetchPlaceDetails()).rejects.toThrow(
      'The operation was aborted due to timeout',
    );
  });
});
