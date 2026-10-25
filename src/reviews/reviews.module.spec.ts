import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGooglePlacesClient } from './reviews.module';
import { FakeGooglePlacesClient } from './google-places/fake-google-places.client';
import { GooglePlacesHttpClient } from './google-places/google-places-http.client';

describe('createGooglePlacesClient', () => {
  it.each([
    ['true', FakeGooglePlacesClient],
    ['false', GooglePlacesHttpClient],
    ['', GooglePlacesHttpClient],
  ])(
    'with USE_SAMPLE_REVIEWS="%s" creates a %p',
    (useSampleReviews, expectedClient) => {
      const configService = new ConfigService({
        USE_SAMPLE_REVIEWS: useSampleReviews,
      });

      expect(createGooglePlacesClient(configService)).toBeInstanceOf(
        expectedClient,
      );
    },
  );

  describe('startup warning', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
      warn.mockRestore();
    });

    // Every setting is explicit: ConfigService falls back to process.env, and
    // docker-compose turns the sample reviews on.
    const UNCONFIGURED = {
      USE_SAMPLE_REVIEWS: 'false',
      GOOGLE_PLACES_API_KEY: '',
      GOOGLE_PLACE_ID: '',
    };

    it.each([
      [{}, 1],
      [{ GOOGLE_PLACES_API_KEY: 'api-key' }, 1],
      [{ GOOGLE_PLACE_ID: 'place-id' }, 1],
      [{ GOOGLE_PLACES_API_KEY: 'api-key', GOOGLE_PLACE_ID: 'place-id' }, 0],
      [{ USE_SAMPLE_REVIEWS: 'true' }, 0],
    ])(
      'with the settings %j, warns %i time(s)',
      (settings, expectedWarnings) => {
        createGooglePlacesClient(
          new ConfigService({ ...UNCONFIGURED, ...settings }),
        );

        expect(warn).toHaveBeenCalledTimes(expectedWarnings);
      },
    );
  });
});
