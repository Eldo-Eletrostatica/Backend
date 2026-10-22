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

  it('returns the place details sent by Google', async () => {
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
      }),
    );
  });

  it('fails when Google responds with an error status', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const client = new GooglePlacesHttpClient('api-key', 'place-id');

    await expect(client.fetchPlaceDetails()).rejects.toThrow(
      'Google Places API responded with 403',
    );
  });
});
