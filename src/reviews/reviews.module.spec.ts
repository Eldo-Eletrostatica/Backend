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
});
